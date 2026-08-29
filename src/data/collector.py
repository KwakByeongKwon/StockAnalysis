"""네이버 금융 및 KRX 기반 국내 주식 데이터 수집기 모듈.

KOSPI/KOSDAQ 전 종목 마스터, 실시간 시세 요약,
[1분, 3분, 5분, 10분, 30분, 60분] 분봉 및 일봉(1일), 주봉(1주), 월봉(한달) 전체 시계열 데이터를 수집합니다.
방어적 에러 핸들링 및 재시도(Exponential Backoff), DatetimeIndex 정합성을 보장합니다.
"""

import io
import logging
import time
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
import numpy as np
import pandas as pd
import requests

from src.config import settings
from src.models.stock import MarketType, StockItem, StockSummary, TimeFrame

logger = logging.getLogger(__name__)


class NaverFinanceCollector:
    """네이버 증권 및 KRX 데이터 수집기."""

    BASE_CHART_URL = "https://fchart.stock.naver.com/sise.nhn"
    BASE_BASIC_URL = "https://m.stock.naver.com/api/stock/{symbol}/basic"
    BASE_MINUTE_JSON_URL = "https://api.stock.naver.com/chart/domestic/item/{symbol}/minute"
    KRX_MASTER_URL = "http://kind.krx.co.kr/corpgeneral/corpList.do?method=download&searchType=13"

    DEFAULT_HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "application/json, text/plain, */*",
        "Referer": "https://m.stock.naver.com/",
    }

    POPULAR_STOCKS = [
        {"symbol": "005930", "name": "삼성전자", "market": MarketType.KOSPI},
        {"symbol": "000660", "name": "SK하이닉스", "market": MarketType.KOSPI},
        {"symbol": "373220", "name": "LG에너지솔루션", "market": MarketType.KOSPI},
        {"symbol": "207940", "name": "삼성바이오로직스", "market": MarketType.KOSPI},
        {"symbol": "005380", "name": "현대차", "market": MarketType.KOSPI},
        {"symbol": "000270", "name": "기아", "market": MarketType.KOSPI},
        {"symbol": "068270", "name": "셀트리온", "market": MarketType.KOSPI},
        {"symbol": "105560", "name": "KB금융", "market": MarketType.KOSPI},
        {"symbol": "035420", "name": "NAVER", "market": MarketType.KOSPI},
        {"symbol": "035720", "name": "카카오", "market": MarketType.KOSPI},
        {"symbol": "247540", "name": "에코프로비엠", "market": MarketType.KOSDAQ},
        {"symbol": "086520", "name": "에코프로", "market": MarketType.KOSDAQ},
        {"symbol": "028300", "name": "HLB", "market": MarketType.KOSDAQ},
        {"symbol": "277810", "name": "레인보우로보틱스", "market": MarketType.KOSDAQ},
        {"symbol": "058470", "name": "리노공업", "market": MarketType.KOSDAQ},
    ]

    def __init__(self, timeout: int = 8, max_retries: int = 3) -> None:
        """수집기 초기화.
        
        Args:
            timeout: HTTP 요청 타임아웃(초)
            max_retries: 최대 재시도 횟수
        """
        self.timeout = timeout
        self.max_retries = max_retries
        self.session = requests.Session()
        self.session.headers.update(self.DEFAULT_HEADERS)

    def _request_with_retry(self, url: str, params: Optional[Dict] = None) -> requests.Response:
        """Exponential Backoff를 적용한 안전한 HTTP 요청 수행."""
        last_error = None
        for attempt in range(1, self.max_retries + 1):
            try:
                response = self.session.get(url, params=params, timeout=self.timeout)
                response.raise_for_status()
                return response
            except (requests.RequestException, Exception) as e:
                last_error = e
                wait_time = 0.5 * (2 ** (attempt - 1))
                logger.warning(
                    f"요청 실패 (시도 {attempt}/{self.max_retries}) URL: {url} -> {e}. {wait_time}초 대기"
                )
                time.sleep(wait_time)

        raise RuntimeError(f"최대 재시도 초과 ({self.max_retries}회): {last_error}")

    def get_stock_master(self, force_refresh: bool = False) -> List[StockItem]:
        """KOSPI/KOSDAQ 전체 상장 종목 마스터 목록을 반환합니다."""
        master_cache_path = settings.cache_dir / "stock_master.parquet"

        if not force_refresh and master_cache_path.exists():
            try:
                df = pd.read_parquet(master_cache_path)
                return [
                    StockItem(
                        symbol=str(row["symbol"]).zfill(6),
                        name=str(row["name"]),
                        market=MarketType(row.get("market", MarketType.UNKNOWN.value)),
                    )
                    for _, row in df.iterrows()
                ]
            except Exception as e:
                logger.warning(f"종목 마스터 캐시 로드 실패: {e}")

        # KRX 상장법인목록 다운로드
        try:
            res = self._request_with_retry(self.KRX_MASTER_URL)
            dfs = pd.read_html(io.BytesIO(res.content), encoding="euc-kr")
            if not dfs or dfs[0].empty:
                raise ValueError("KRX 데이터 파싱 실패")

            raw_df = dfs[0]
            items: List[StockItem] = []
            records = []

            for _, row in raw_df.iterrows():
                code_raw = str(row.get("종목코드", "")).strip()
                name_raw = str(row.get("회사명", "")).strip()
                if not code_raw or not name_raw:
                    continue

                symbol = code_raw.zfill(6)
                item = StockItem(
                    symbol=symbol,
                    name=name_raw,
                    market=MarketType.KOSPI,
                )
                items.append(item)
                records.append({
                    "symbol": symbol,
                    "name": name_raw,
                    "market": MarketType.KOSPI.value,
                })

            cache_df = pd.DataFrame(records)
            cache_df.to_parquet(master_cache_path, index=False)
            return items

        except Exception as e:
            logger.error(f"KRX 종목 마스터 수집 실패, 기본 프리셋으로 대체: {e}")
            return [StockItem(**item) for item in self.POPULAR_STOCKS]

    def search_stocks(self, query: str) -> List[StockItem]:
        """종목명 또는 종목코드로 검색합니다."""
        query = query.strip()
        if not query:
            return [StockItem(**item) for item in self.POPULAR_STOCKS]

        master = self.get_stock_master()
        results: List[StockItem] = []
        query_upper = query.upper()

        for item in master:
            if query_upper in item.symbol or query_upper in item.name.upper():
                results.append(item)
                if len(results) >= 40:
                    break

        return results

    def get_stock_summary(self, symbol: str) -> StockSummary:
        """종목의 실시간 시세 및 밸류에이션 요약 정보를 수집합니다."""
        clean_symbol = symbol.strip().zfill(6)
        url = self.BASE_BASIC_URL.format(symbol=clean_symbol)
        
        res = self._request_with_retry(url)
        data = res.json()

        def parse_float(val: Optional[str | int | float]) -> Optional[float]:
            if val is None or val == "" or val == "-":
                return None
            try:
                return float(str(val).replace(",", "").replace("%", ""))
            except ValueError:
                return None

        def parse_int(val: Optional[str | int | float]) -> int:
            if val is None or val == "" or val == "-":
                return 0
            try:
                return int(float(str(val).replace(",", "")))
            except ValueError:
                return 0

        sosok_code = str(data.get("sosok", ""))
        market = MarketType.KOSPI if sosok_code == "0" else (
            MarketType.KOSDAQ if sosok_code == "1" else MarketType.UNKNOWN
        )

        current_price = parse_float(data.get("closePrice")) or 0.0
        change = parse_float(data.get("compareToPreviousClosePrice")) or 0.0
        change_rate = parse_float(data.get("fluctuationsRatio")) or 0.0
        open_price = parse_float(data.get("openPrice")) or current_price
        high_price = parse_float(data.get("highPrice")) or current_price
        low_price = parse_float(data.get("lowPrice")) or current_price
        volume = parse_int(data.get("accumulatedTradingVolume"))

        market_cap = parse_float(data.get("marketValue"))
        if market_cap:
            market_cap *= 100_000_000

        high_52w = parse_float(data.get("highPrice52Weeks"))
        low_52w = parse_float(data.get("lowPrice52Weeks"))
        per = parse_float(data.get("per"))
        eps = parse_float(data.get("eps"))
        pbr = parse_float(data.get("pbr"))
        bps = parse_float(data.get("bps"))
        dividend_yield = parse_float(data.get("dividendYield"))
        foreign_rate = parse_float(data.get("foreignRate"))

        return StockSummary(
            symbol=clean_symbol,
            name=data.get("stockName", clean_symbol),
            market=market,
            current_price=current_price,
            change=change,
            change_rate=change_rate,
            open_price=open_price,
            high_price=high_price,
            low_price=low_price,
            volume=volume,
            market_cap=market_cap,
            high_52w=high_52w,
            low_52w=low_52w,
            per=per,
            eps=eps,
            pbr=pbr,
            bps=bps,
            dividend_yield=dividend_yield,
            foreign_rate=foreign_rate,
            updated_at=datetime.now(settings.timezone),
        )

    def _get_minute_ohlcv(self, symbol: str) -> pd.DataFrame:
        """1분봉 원시 데이터를 수집합니다."""
        clean_symbol = symbol.strip().zfill(6)
        records = []

        # 1. 네이버 실시간 JSON 분봉 API 호출
        try:
            json_url = self.BASE_MINUTE_JSON_URL.format(symbol=clean_symbol)
            res = self._request_with_retry(json_url)
            items = res.json()
            if isinstance(items, list):
                for item in items:
                    dt_str = item.get("localDateTime")
                    if not dt_str:
                        continue
                    dt = datetime.strptime(str(dt_str), "%Y%m%d%H%M%S")
                    o = float(item.get("openPrice", 0))
                    h = float(item.get("highPrice", 0))
                    l = float(item.get("lowPrice", 0))
                    c = float(item.get("currentPrice", 0))
                    v = int(item.get("accumulatedTradingVolume", 0))

                    records.append({
                        "timestamp": dt,
                        "open": o,
                        "high": max(o, h, l, c),
                        "low": min(o, h, l, c),
                        "close": c,
                        "volume": v,
                    })
        except Exception as e:
            logger.warning(f"JSON 분봉 수집 실패 [{clean_symbol}]: {e}")

        # 누적 거래량 -> 분 단위 개별 거래량으로 차분 변환
        df = pd.DataFrame(records)
        if df.empty:
            return pd.DataFrame(columns=["open", "high", "low", "close", "volume"])

        df["timestamp"] = pd.to_datetime(df["timestamp"])
        df["timestamp"] = df["timestamp"].dt.tz_localize("Asia/Seoul", ambiguous="NaT", nonexistent="shift_forward")
        df.set_index("timestamp", inplace=True)
        df.sort_index(inplace=True)

        # 누적 거래량 분당 거래량으로 계산
        vol_diff = df["volume"].diff()
        vol_diff.iloc[0] = df["volume"].iloc[0]
        df["volume"] = vol_diff.clip(lower=0).astype(int)

        return df

    def get_ohlcv(
        self,
        symbol: str,
        timeframe: TimeFrame = TimeFrame.DAY,
        count: int = 3000,
    ) -> pd.DataFrame:
        """종목의 과거 OHLCV 시계열 데이터를 수집합니다.
        
        Args:
            symbol: 6자리 종목코드
            timeframe: 주기 (1m, 3m, 5m, 10m, 30m, 60m, day, week, month)
            count: 조회할 바(bar) 개수 (기본 3000개 전체)
            
        Returns:
            DatetimeIndex를 가진 DataFrame (open, high, low, close, volume)
        """
        clean_symbol = symbol.strip().zfill(6)

        # 분봉 처리 (1분, 3분, 5분, 10분, 30분, 60분)
        if timeframe in [
            TimeFrame.MINUTE_1,
            TimeFrame.MINUTE_3,
            TimeFrame.MINUTE_5,
            TimeFrame.MINUTE_10,
            TimeFrame.MINUTE_30,
            TimeFrame.MINUTE_60,
        ]:
            raw_1m_df = self._get_minute_ohlcv(clean_symbol)
            if raw_1m_df.empty:
                return pd.DataFrame(columns=["open", "high", "low", "close", "volume"])

            if timeframe == TimeFrame.MINUTE_1:
                return raw_1m_df

            # 주기별 리샘플링
            min_map = {
                TimeFrame.MINUTE_3: "3min",
                TimeFrame.MINUTE_5: "5min",
                TimeFrame.MINUTE_10: "10min",
                TimeFrame.MINUTE_30: "30min",
                TimeFrame.MINUTE_60: "60min",
            }
            freq = min_map[timeframe]
            resampled = raw_1m_df.resample(freq).agg({
                "open": "first",
                "high": "max",
                "low": "min",
                "close": "last",
                "volume": "sum",
            }).dropna()

            return resampled

        # 일봉 / 주봉 / 월봉 처리
        tf_mapping = {
            TimeFrame.DAY: "day",
            TimeFrame.WEEK: "week",
            TimeFrame.MONTH: "month",
        }
        naver_tf = tf_mapping.get(timeframe, "day")

        params = {
            "symbol": clean_symbol,
            "timeframe": naver_tf,
            "count": count,
            "requestType": "0",
        }

        res = self._request_with_retry(self.BASE_CHART_URL, params=params)
        
        try:
            root = ET.fromstring(res.text)
            items = root.findall(".//item")
            if not items:
                raise ValueError(f"시계열 데이터 없음 [{clean_symbol}]")

            records = []
            for item in items:
                raw_data = item.get("data")
                if not raw_data:
                    continue

                parts = raw_data.strip().split("|")
                if len(parts) < 6:
                    continue

                date_str = parts[0].strip()
                open_p = float(parts[1])
                high_p = float(parts[2])
                low_p = float(parts[3])
                close_p = float(parts[4])
                vol = int(parts[5])

                high_valid = max(open_p, high_p, low_p, close_p)
                low_valid = min(open_p, high_p, low_p, close_p)

                dt = datetime.strptime(date_str, "%Y%m%d")

                records.append({
                    "timestamp": dt,
                    "open": open_p,
                    "high": high_valid,
                    "low": low_valid,
                    "close": close_p,
                    "volume": vol,
                })

            df = pd.DataFrame(records)
            if df.empty:
                return pd.DataFrame(columns=["open", "high", "low", "close", "volume"])

            df["timestamp"] = pd.to_datetime(df["timestamp"])
            df["timestamp"] = df["timestamp"].dt.tz_localize("Asia/Seoul", ambiguous="NaT", nonexistent="shift_forward")
            df.set_index("timestamp", inplace=True)
            df.sort_index(inplace=True)

            return df

        except Exception as e:
            logger.error(f"OHLCV 파싱 실패 [{clean_symbol}]: {e}", exc_info=True)
            raise
