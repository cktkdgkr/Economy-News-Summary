export interface DigestItem {
  source: string;
  title: string;
  shortSummary: string; // ≤60자
}

export interface DailyDigest {
  dateKst: string;      // "2026-05-22" (KST 기준 날짜 키)
  headline: string;     // 80~120자 통합 헤드라인
  items: DigestItem[];  // 개별 기사 요약
  windowStart: string;  // ISO 8601 UTC
  windowEnd: string;    // ISO 8601 UTC
  articleCount: number; // 수집된 기사 수 (items.length와 다를 수 있음)
  createdAt: string;    // ISO 8601 UTC
  expiresAt: string;    // createdAt + 90일 (Firestore TTL용)
}
