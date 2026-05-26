/** KST = UTC+9, DST 없음 */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * nowUtc 기준 "전일 KST 00:00 ~ 당일 KST 00:00" UTC 시각을 반환한다.
 *
 * KST 자정 = UTC 전날 15:00:00Z (= UTC+9이므로 24-9 = 15시).
 *
 * 예: nowUtc = 2026-05-22T22:00:00Z (KST 2026-05-23 07:00)
 *   → start = 2026-05-21T15:00:00Z  (KST 2026-05-22 00:00)
 *   → end   = 2026-05-22T15:00:00Z  (KST 2026-05-23 00:00)
 *
 * 예: nowUtc = 2026-05-22T14:59:00Z (KST 2026-05-22 23:59)
 *   → start = 2026-05-20T15:00:00Z  (KST 2026-05-21 00:00)
 *   → end   = 2026-05-21T15:00:00Z  (KST 2026-05-22 00:00)
 */
export function getKstWindow(nowUtc: Date): { start: Date; end: Date } {
  // nowUtc에 KST 오프셋을 더해 KST 시각을 구한다
  const kstNow = new Date(nowUtc.getTime() + KST_OFFSET_MS);

  // KST 기준 오늘 날짜에서 하루를 빼 전일(yesterday) KST 날짜를 구한다
  const kstYesterdayMidnight = Date.UTC(
    kstNow.getUTCFullYear(),
    kstNow.getUTCMonth(),
    kstNow.getUTCDate() - 1,
  );

  // 전일 KST 00:00을 UTC로 변환: KST 00:00 = UTC 전날 15:00
  const startMs = kstYesterdayMidnight - KST_OFFSET_MS;
  const start = new Date(startMs);
  const end = new Date(startMs + DAY_MS);

  return { start, end };
}
