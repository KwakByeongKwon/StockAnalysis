# StockAnalysis - 국내 주식 정보 수집 및 차트 분석 시스템

`.agents` 및 `AGENTS.md` 가이드라인(방어적 프로그래밍, SRP, Pydantic 스키마 검증, Parquet 캐싱, KST 타임존 보존)을 준수하여 개발된 국내 주식(KOSPI / KOSDAQ) 실시간 시세 및 기술적 차트 분석 대시보드입니다.

---

## 🚀 빠른 시작 가이드 (Quick Start)

### 1. 가상환경 및 의존성 설치
```bash
pip install -r requirements.txt
```

### 2. Streamlit 대시보드 실행
```bash
streamlit run app.py
```

### 3. 단위 테스트 실행
```bash
pytest -v
```

---

## 🏗️ 아키텍처 및 디렉토리 구조

```
StockAnalysis/
├── app.py                      # Streamlit 웹 대시보드 메인 엔트리포인트
├── requirements.txt            # 의존성 패키지 명세
├── pytest.ini                  # pytest 설정
├── data/
│   └── cache/                  # Parquet 시계열 데이터 캐시 (.parquet)
├── src/
│   ├── config.py               # 시스템 환경설정 및 KST 타임존 관리
│   ├── models/
│   │   ├── __init__.py
│   │   └── stock.py            # Pydantic v2 데이터 모델 (StockSummary, OHLCVBar 등)
│   ├── data/
│   │   ├── __init__.py
│   │   ├── collector.py        # 네이버 금융/KRX 데이터 수집 어댑터
│   │   └── repository.py       # Cache-first 데이터 통합 레포지토리
│   ├── storage/
│   │   ├── __init__.py
│   │   └── cache_manager.py    # Apache Parquet 고성능 로컬 캐시 매니저
│   └── ui/
│       └── components/
│           ├── __init__.py
│           ├── chart.py        # Plotly 기반 캔들스틱/이동평균/거래량 차트
│           └── metrics.py      # 실시간 시세 & 팩터 메트릭 카드
└── tests/
    ├── test_models.py          # Pydantic 모델 단위 테스트
    ├── test_collector.py       # API 수집 및 OHLCV 데이터 무결성 테스트
    └── test_cache.py           # Parquet 캐싱 및 증분 업데이트 테스트
```

---

## 🌟 주요 기능 (Key Features)

1. **국내 전 종목 실시간 검색 및 시세 조회**:
   - KOSPI, KOSDAQ 상장 전 종목(2,800+개) 마스터 검색 지원
   - 현재가, 전일대비, 등락률, 시가총액, PER, PBR, 52주 최고/최저가 등 실시간 요약
2. **프로급 인터랙티브 캔들스틱 차트 (Plotly)**:
   - 한국 주식 시장 컬러 컨벤션 적용 (상승 빨강, 하락 파랑)
   - 이동평균선(MA 5/20/60/120), 거래량 이동평균, 볼린저 밴드 오버레이
   - 기간별(1M, 3M, 6M, 1Y, 3Y, ALL) 줌 & 인터랙티브 툴팁 호버
3. **고성능 로컬 Parquet 캐싱**:
   - `pyarrow` 기반 압축 저장으로 네트워크 비용 및 지연시간 최소화
   - 증분 업데이트(Incremental Sync)로 과거 데이터 누락 없이 최신 시세 병합
   - 시계열 원본 데이터 CSV 및 Parquet 다운로드 지원
