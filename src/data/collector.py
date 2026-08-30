"""국내 전종목 상장일~현재 전체 시계열 수집 및 증분 수집(Incremental Sync) 모듈.

yfinance 및 네이버 금융 API를 결합하여 국내 전종목(KOSPI/KOSDAQ)의 상장일부터
현재까지의 수천 개 전체 일봉 데이터를 수집하고, 증분 업데이트를 지원합니다.
"""

import io
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from zoneinfo import ZoneInfo
import numpy as np
import pandas as pd
import requests
import yfinance as yf

from src.config import settings
from src.models.stock import MarketType, StockItem, StockSummary, TimeFrame

logger = logging.getLogger(__name__)


class NaverFinanceCollector:
    """국내 주식 전체 시계열 및 실시간 시세 수집기."""

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

    def _get_ticker_symbol(self, symbol: str, market: MarketType = MarketType.UNKNOWN) -> str:
        """yfinance 형식의 티커 심볼(005930.KS 또는 247540.KQ)을 반환합니다."""
        clean_symbol = symbol.strip().zfill(6)
        if market == MarketType.KOSDAQ:
            return f"{clean_symbol}.KQ"
        return f"{clean_symbol}.KS"

    def get_full_history(
        self,
        symbol: str,
        market: MarketType = MarketType.UNKNOWN,
        start_date: Optional[str | datetime] = None,
    ) -> pd.DataFrame:
        """상장 시점부터 현재까지 전체 일봉 시계열을 수집합니다 (yfinance max history)."""
        clean_symbol = symbol.strip().zfill(6)
        
        # 1차 시도: 시장에 맞는 티커
        ticker_candidates = [
            self._get_ticker_symbol(clean_symbol, market),
            f"{clean_symbol}.KQ" if market != MarketType.KOSDAQ else f"{clean_symbol}.KS",
        ]

        df: Optional[pd.DataFrame] = None
        for ticker in ticker_candidates:
            try:
                t = yf.Ticker(ticker)
                if start_date:
                    raw_df = t.history(start=start_date)
                else:
                    raw_df = t.history(period="max")

                if raw_df is not None and not raw_df.empty:
                    df = raw_df
                    break
            except Exception as e:
                logger.warning(f"yfinance 조회 실패 [{ticker}]: {e}")

        if df is None or df.empty:
            return pd.DataFrame(columns=["open", "high", "low", "close", "volume"])

        # 표준 컬럼 정규화
        df = df.rename(columns={
            "Open": "open",
            "High": "high",
            "Low": "low",
            "Close": "close",
            "Volume": "volume",
        })
        
        # 필요한 컬럼만 추출 및 무결성 보정 (High >= max(O,C,H,L), Low <= min(O,C,H,L))
        df = df[["open", "high", "low", "close", "volume"]].copy()
        df["high"] = df[["open", "high", "low", "close"]].max(axis=1)
        df["low"] = df[["open", "high", "low", "close"]].min(axis=1)

        # DatetimeIndex 정규화 (KST 타임존)
        if not isinstance(df.index, pd.DatetimeIndex):
            df.index = pd.to_datetime(df.index)

        if df.index.tz is None:
            df.index = df.index.tz_localize("Asia/Seoul")
        else:
            df.index = df.index.tz_convert("Asia/Seoul")

        df.index.name = "timestamp"
        df.sort_index(inplace=True)

        return df

    def get_minute_history(self, symbol: str, timeframe: TimeFrame = TimeFrame.MINUTE_1) -> pd.DataFrame:
        """네이버 실시간 분봉 데이터를 수집 및 리샘플링합니다."""
        clean_symbol = symbol.strip().zfill(6)
        json_url = self.BASE_MINUTE_JSON_URL.format(symbol=clean_symbol)
        
        records = []
        try:
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
            logger.warning(f"분봉 수집 실패 [{clean_symbol}]: {e}")

        df = pd.DataFrame(records)
        if df.empty:
            return pd.DataFrame(columns=["open", "high", "low", "close", "volume"])

        df["timestamp"] = pd.to_datetime(df["timestamp"])
        df["timestamp"] = df["timestamp"].dt.tz_localize("Asia/Seoul", ambiguous="NaT", nonexistent="shift_forward")
        df.set_index("timestamp", inplace=True)
        df.sort_index(inplace=True)

        vol_diff = df["volume"].diff()
        vol_diff.iloc[0] = df["volume"].iloc[0]
        df["volume"] = vol_diff.clip(lower=0).astype(int)

        if timeframe == TimeFrame.MINUTE_1:
            return df

        min_map = {
            TimeFrame.MINUTE_3: "3min",
            TimeFrame.MINUTE_5: "5min",
            TimeFrame.MINUTE_10: "10min",
            TimeFrame.MINUTE_30: "30min",
            TimeFrame.MINUTE_60: "60min",
        }
        freq = min_map.get(timeframe, "5min")
        resampled = df.resample(freq).agg({
            "open": "first",
            "high": "max",
            "low": "min",
            "close": "last",
            "volume": "sum",
        }).dropna()

        return resampled

    def get_ohlcv(
        self,
        symbol: str,
        timeframe: TimeFrame = TimeFrame.DAY,
        count: int = 10000,
    ) -> pd.DataFrame:
        """단일 메서드로 주기별 OHLCV 시계열 데이터를 조회합니다."""
        is_minute = timeframe in [
            TimeFrame.MINUTE_1,
            TimeFrame.MINUTE_3,
            TimeFrame.MINUTE_5,
            TimeFrame.MINUTE_10,
            TimeFrame.MINUTE_30,
            TimeFrame.MINUTE_60,
        ]
        if is_minute:
            return self.get_minute_history(symbol, timeframe)
        return self.get_full_history(symbol)
