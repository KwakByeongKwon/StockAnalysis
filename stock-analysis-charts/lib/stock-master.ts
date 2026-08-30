import type { StockMeta } from "./types"

// 기본 60대 핵심 종목 마스터
export const STOCK_MASTER: StockMeta[] = [
  { code: "005930", name: "삼성전자", market: "KOSPI", listedAt: "1975-06-11" },
  { code: "000660", name: "SK하이닉스", market: "KOSPI", listedAt: "1996-12-26" },
  { code: "373220", name: "LG에너지솔루션", market: "KOSPI", listedAt: "2022-01-27" },
  { code: "207940", name: "삼성바이오로직스", market: "KOSPI", listedAt: "2016-11-10" },
  { code: "005380", name: "현대차", market: "KOSPI", listedAt: "1974-06-28" },
  { code: "005935", name: "삼성전자우", market: "KOSPI", listedAt: "1989-09-20" },
  { code: "000270", name: "기아", market: "KOSPI", listedAt: "1973-07-05" },
  { code: "068270", name: "셀트리온", market: "KOSPI", listedAt: "2018-02-09" },
  { code: "035420", name: "NAVER", market: "KOSPI", listedAt: "2008-11-28" },
  { code: "105560", name: "KB금융", market: "KOSPI", listedAt: "2008-10-10" },
  { code: "005490", name: "POSCO홀딩스", market: "KOSPI", listedAt: "1988-06-10" },
  { code: "012330", name: "현대모비스", market: "KOSPI", listedAt: "1989-01-27" },
  { code: "055550", name: "신한지주", market: "KOSPI", listedAt: "2001-09-10" },
  { code: "035720", name: "카카오", market: "KOSPI", listedAt: "2017-07-10" },
  { code: "051910", name: "LG화학", market: "KOSPI", listedAt: "2001-04-25" },
  { code: "006400", name: "삼성SDI", market: "KOSPI", listedAt: "1979-02-27" },
  { code: "028260", name: "삼성물산", market: "KOSPI", listedAt: "2015-09-15" },
  { code: "003670", name: "포스코퓨처엠", market: "KOSPI", listedAt: "2019-03-15" },
  { code: "015760", name: "한국전력", market: "KOSPI", listedAt: "1989-08-10" },
  { code: "032830", name: "삼성생명", market: "KOSPI", listedAt: "2010-05-12" },
  { code: "086790", name: "하나금융지주", market: "KOSPI", listedAt: "2005-12-12" },
  { code: "000810", name: "삼성화재", market: "KOSPI", listedAt: "1975-06-30" },
  { code: "066570", name: "LG전자", market: "KOSPI", listedAt: "2002-04-22" },
  { code: "323410", name: "카카오뱅크", market: "KOSPI", listedAt: "2021-08-06" },
  { code: "138040", name: "메리츠금융지주", market: "KOSPI", listedAt: "2011-03-28" },
  { code: "010130", name: "고려아연", market: "KOSPI", listedAt: "1990-11-08" },
  { code: "009150", name: "삼성전기", market: "KOSPI", listedAt: "1979-02-27" },
  { code: "011200", name: "HMM", market: "KOSPI", listedAt: "1995-09-06" },
  { code: "329180", name: "HD현대중공업", market: "KOSPI", listedAt: "2021-09-17" },
  { code: "010140", name: "삼성중공업", market: "KOSPI", listedAt: "1994-01-14" },
  { code: "018260", name: "삼성에스디에스", market: "KOSPI", listedAt: "2014-11-14" },
  { code: "096770", name: "SK이노베이션", market: "KOSPI", listedAt: "2007-07-25" },
  { code: "034730", name: "SK", market: "KOSPI", listedAt: "2007-07-25" },
  { code: "017670", name: "SK텔레콤", market: "KOSPI", listedAt: "1989-11-06" },
  { code: "030200", name: "KT", market: "KOSPI", listedAt: "1998-12-23" },
  { code: "033780", name: "KT&G", market: "KOSPI", listedAt: "1999-10-08" },
  { code: "003550", name: "LG", market: "KOSPI", listedAt: "1970-02-13" },
  { code: "352820", name: "하이브", market: "KOSPI", listedAt: "2020-10-15" },
  { code: "259960", name: "크래프톤", market: "KOSPI", listedAt: "2021-08-10" },
  { code: "247540", name: "에코프로비엠", market: "KOSDAQ", listedAt: "2019-03-05" },
  { code: "086520", name: "에코프로", market: "KOSDAQ", listedAt: "2007-07-27" },
  { code: "196170", name: "알테오젠", market: "KOSDAQ", listedAt: "2014-12-22" },
  { code: "068760", name: "셀트리온제약", market: "KOSDAQ", listedAt: "2008-08-27" },
  { code: "066970", name: "엘앤에프", market: "KOSDAQ", listedAt: "2003-01-02" },
  { code: "058470", name: "리노공업", market: "KOSDAQ", listedAt: "2001-12-18" },
  { code: "357780", name: "솔브레인", market: "KOSDAQ", listedAt: "2020-06-19" },
  { code: "293490", name: "카카오게임즈", market: "KOSDAQ", listedAt: "2020-09-10" },
  { code: "112040", name: "위메이드", market: "KOSDAQ", listedAt: "2009-12-18" },
  { code: "035900", name: "JYP Ent.", market: "KOSDAQ", listedAt: "2001-08-23" },
  { code: "041510", name: "에스엠", market: "KOSDAQ", listedAt: "2000-04-13" },
  { code: "263750", name: "펄어비스", market: "KOSDAQ", listedAt: "2017-09-14" },
  { code: "022100", name: "포스코DX", market: "KOSDAQ", listedAt: "1994-09-08" },
  { code: "028300", name: "HLB", market: "KOSDAQ", listedAt: "1996-07-05" },
]

// 동적 마스터 풀 캐시 (2,700+개 종목)
const dynamicMasterMap = new Map<string, StockMeta>()

// 기본 종목 초기 등록
for (const s of STOCK_MASTER) {
  dynamicMasterMap.set(s.code, s)
}

export function registerDynamicStock(code: string, name: string, market: "KOSPI" | "KOSDAQ") {
  if (!dynamicMasterMap.has(code)) {
    dynamicMasterMap.set(code, {
      code,
      name,
      market,
      listedAt: "2000-01-01",
    })
  }
}

export function searchStocks(query: string, limit = 20): StockMeta[] {
  const q = query.trim().toLowerCase()
  const all = Array.from(dynamicMasterMap.values())
  if (!q) return all.slice(0, limit)

  return all
    .filter((s) => s.name.toLowerCase().includes(q) || s.code.includes(q))
    .slice(0, limit)
}

export function getStock(code: string): StockMeta | undefined {
  return dynamicMasterMap.get(code)
}
