"""주식 데이터 레포지토리 모듈.

로컬 Parquet 캐시와 원격 수집기(Collector)를 통합하여 일관된 데이터 인터페이스를 제공하고,
보조지표(이동평균선, 볼린저 밴드 등) 계산 로직을 지원합니다.
"""

import logging
from typing import List, Optional
import numpy as np
import pandas as pd

from src.data.collector import NaverFinanceCollector
from src.models.stock import StockItem, StockSummary, TimeFrame
from src.storage.cache_manager import ParquetCacheManager

logger = logging.getLogger(__name__)


class StockRepository:
    """주식 데이터 통합 레포지토리."""

    def __init__(
        self,
        collector: Optional[NaverFinanceCollector] = None,
        cache_manager: Optional[ParquetCacheManager] = None,
    ) -> None:
        """레포지토리 인스턴스 초기화."""
        self.collector = collector or NaverFinanceCollector()
        self.cache_manager = cache_manager or ParquetCacheManager()

    def get_stock_master(self, force_refresh: bool = False) -> List[StockItem]:
        """전체 종목 마스터 목록을 조회합니다."""
        return self.collector.get_stock_master(force_refresh=force_refresh)

    def search_stocks(self, query: str) -> List[StockItem]:
        """종목명 또는 종목코드로 검색합니다."""
        return self.collector.search_stocks(query)

    def get_stock_summary(self, symbol: str) -> StockSummary:
        """종목의 실시간 시세 요약 정보를 조회합니다."""
        return self.collector.get_stock_summary(symbol)

    def get_ohlcv(
        self,
        symbol: str,
        timeframe: TimeFrame = TimeFrame.DAY,
        count: int = 1500,
        force_refresh: bool = False,
        add_indicators: bool = True,
    ) -> pd.DataFrame:
        """종목의 시계열 OHLCV 데이터를 조회합니다 (Cache-first 전략).

        Args:
            symbol: 6자리 종목코드
            timeframe: 주기
            count: 요청 바 개수
            force_refresh: 강제 원격 수집 여부
            add_indicators: 이동평균 등 보조지표 계산 포함 여부

        Returns:
            정제된 시계열 DataFrame
        """
        df: Optional[pd.DataFrame] = None

        if not force_refresh:
            df = self.cache_manager.load_ohlcv(symbol, timeframe)

        if df is None or df.empty or force_refresh:
            # 원격 수집
            df = self.collector.get_ohlcv(symbol, timeframe, count=count)
            # 캐시 저장
            self.cache_manager.save_ohlcv(symbol, df, timeframe, merge_existing=True)

        if add_indicators and not df.empty:
            df = self._add_technical_indicators(df)

        return df

    def _add_technical_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """주요 기술적 지표(이동평균선, 볼린저 밴드)를 계산하여 컬럼을 추가합니다."""
        res_df = df.copy()
        
        # 이동평균선 (Moving Averages)
        for ma in [5, 20, 60, 120, 200]:
            res_df[f"MA_{ma}"] = res_df["close"].rolling(window=ma).mean()

        # 거래량 이동평균
        res_df["V_MA_5"] = res_df["volume"].rolling(window=5).mean()
        res_df["V_MA_20"] = res_df["volume"].rolling(window=20).mean()

        # 볼린저 밴드 (20일, 2표준편차)
        ma20 = res_df["close"].rolling(window=20).mean()
        std20 = res_df["close"].rolling(window=20).std()
        res_df["BB_upper"] = ma20 + (std20 * 2)
        res_df["BB_lower"] = ma20 - (std20 * 2)
        res_df["BB_middle"] = ma20

        return res_df

    def get_cache_status(self, symbol: str, timeframe: TimeFrame = TimeFrame.DAY) -> Optional[dict]:
        """로컬 캐시 상태 정보를 반환합니다."""
        return self.cache_manager.get_cache_info(symbol, timeframe)
