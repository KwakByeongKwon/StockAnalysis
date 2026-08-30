# 📈 StockAnalysis PRO (한국형 퀀트 & AI 주가 예측 시스템)

대한민국 상장 전종목(2,700+개) 실시간 시세, SQLite 고속 영구 시계열 저장소, 차트·재무·뉴스 종합 Google Gemini AI 주가 등락 예측 및 과거 적중률(Hit Rate) 백테스팅을 제공하는 현대적인 풀스택 주식 분석 웹 애플리케이션입니다.

---

## 🌟 핵심 기능

1. **📊 한국형 고성능 차트 (Lightweight Charts)**:
   - 일봉, 주봉, 월봉, 분봉(1m~60m) 실시간 캔들 차트
   - 5/20/60/120일 이동평균선, 볼린저 밴드, 거래량, RSI, MACD 보조지표
   - 마우스 커서 추적 실시간 HTS 플로팅 정보 박스 (종가, 5/20/60/120선 실시간 노출)
   - 드래그 좌우 이동(Pan) 바운더리 클램프 & `Ctrl + 휠` 마우스 중심 줌(Zoom)
2. **🤖 Google Gemini AI 주가 등락 예측 & 3대 심층 리포트**:
   - **예측 게이지**: 단기(5~10일) 상승(UP) / 하락(DOWN) 확률(%) 및 예상 목표가 산출
   - **과거 예측 적중률**: 최근 10회차 예측 백테스트 및 실제 적중률(Hit Rate) 테이블
   - **3대 분석 카드**: 차트 기술적 지표(40%) + 기업 재무 보고서(30%) + 실시간 뉴스 감성(30%)
3. **🏆 국내 전종목(2,700+개) 실시간 시장 랭킹 & 종목 발굴기**:
   - 코스피(1,200개) + 코스닥(1,500개) 전체 상장사 실시간 랭킹
   - 🔥 거래량 상위 | 🚀 상승률 상위 | 💎 시가총액 상위 3대 핵심 탭
   - 50/100/200개씩 보기 및 1~54페이지 완벽 페이지네이션
   - 전종목 실시간 스마트 검색 및 원클릭 차트 분석 연동
4. **💾 오프라인-퍼스트 SQLite 고속 영구 저장소 & 온디맨드 증분 동기화**:
   - 첫 조회 시 SQLite DB에 영구 저장 -> 이후 네트워크 0회, 0.001초 로컬 초고속 로드
   - `[데이터 최신화]` 버튼 클릭 시 이전 동기화 시점부터 오늘까지의 최신 데이터만 증분 UPSERT 병합

---

## 🛠️ 기술 스택

- **Frontend / Framework**: Next.js 16 (App Router / Turbopack), React 19, TypeScript
- **Styling**: Tailwind CSS v4, Lucide React Icons
- **Charting**: TradingView `lightweight-charts` v5
- **Database**: Node.js Native SQLite (`node:sqlite` DatabaseSync, WAL Mode)
- **AI Engine**: Google Gemini API (`gemini-2.0-flash` / `gemini-1.5-flash`) + Quantitative Multi-Factor Engine
- **Data Source**: 네이버 금융 실시간 공인 시세 피드 & 과거 3,000개 캔들 시계열

---

## 🚀 빠른 시작

### 1. 패키지 설치
```bash
cd stock-analysis-charts
npm install
```

### 2. 환경변수 설정 (`stock-analysis-charts/.env.local`)
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. 개발 서버 실행
```bash
npm run dev
```
브라우저에서 `http://localhost:3000` 접속

---

## 📁 프로젝트 구조

```
StockAnalysis/
├── data/
│   └── stock_analysis.db      # 2,700개 전종목 OHLCV 및 시세 SQLite 영구 DB
└── stock-analysis-charts/     # Next.js 16 풀스택 웹 애플리케이션
    ├── app/                   # App Router (페이지 및 API 라우트)
    │   ├── api/               # 시세, 캔들, 랭킹, 동기화, Gemini AI 라우트
    │   └── page.tsx           # 메인 대시보드
    ├── components/            # React UI 및 차트 컴포넌트
    │   ├── candle-chart.tsx   # HTS 스타일 캔들 차트
    │   ├── ai-consensus-panel.tsx # Gemini AI 주가 예측 & 3대 리포트 패널
    │   ├── market-screener.tsx    # 전종목 실시간 랭킹 스크리너
    │   └── top-bar.tsx        # 상단 검색창 & 데이터 최신화 버튼
    └── lib/                   # 비즈니스 로직, SQLite DB 매니저, AI 서비스
```
