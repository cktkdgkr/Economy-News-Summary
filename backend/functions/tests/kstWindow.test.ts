import { getKstWindow } from "../src/time/kstWindow";

describe("getKstWindow", () => {
  // 케이스 1: KST 오전 7시 (= UTC 전일 22:00)
  // nowUtc = 2026-05-22T22:00:00Z (KST: 2026-05-23 07:00)
  // → start = 2026-05-21T15:00:00Z, end = 2026-05-22T15:00:00Z
  test("KST 오전 7시 기준 전일 KST 00:00~24:00 윈도를 반환한다", () => {
    const nowUtc = new Date("2026-05-22T22:00:00Z");
    const { start, end } = getKstWindow(nowUtc);

    expect(start.toISOString()).toBe("2026-05-21T15:00:00.000Z");
    expect(end.toISOString()).toBe("2026-05-22T15:00:00.000Z");
  });

  // 케이스 2: KST 자정 직후 00:01 (= UTC 전일 15:01)
  // nowUtc = 2026-05-21T15:01:00Z (KST: 2026-05-22 00:01)
  // → start = 2026-05-20T15:00:00Z, end = 2026-05-21T15:00:00Z
  test("KST 자정 직후(00:01) 기준 전일 KST 00:00~24:00 윈도를 반환한다", () => {
    const nowUtc = new Date("2026-05-21T15:01:00Z");
    const { start, end } = getKstWindow(nowUtc);

    expect(start.toISOString()).toBe("2026-05-20T15:00:00.000Z");
    expect(end.toISOString()).toBe("2026-05-21T15:00:00.000Z");
  });

  // 케이스 3: KST 23:59 (= UTC 당일 14:59)
  // nowUtc = 2026-05-22T14:59:00Z (KST: 2026-05-22 23:59)
  // → 전일 KST = 2026-05-21
  // → start = 2026-05-20T15:00:00Z, end = 2026-05-21T15:00:00Z
  test("KST 23:59 기준 전일 KST 00:00~24:00 윈도를 반환한다", () => {
    const nowUtc = new Date("2026-05-22T14:59:00Z");
    const { start, end } = getKstWindow(nowUtc);

    expect(start.toISOString()).toBe("2026-05-20T15:00:00.000Z");
    expect(end.toISOString()).toBe("2026-05-21T15:00:00.000Z");
  });

  // 추가 케이스: end - start = 정확히 24시간
  test("start와 end의 차이는 정확히 24시간이다", () => {
    const nowUtc = new Date("2026-05-22T22:00:00Z");
    const { start, end } = getKstWindow(nowUtc);

    const diffMs = end.getTime() - start.getTime();
    expect(diffMs).toBe(24 * 60 * 60 * 1000);
  });
});
