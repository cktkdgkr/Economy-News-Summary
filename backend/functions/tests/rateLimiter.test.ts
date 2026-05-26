import { RateLimiter } from "../src/summarize/rateLimiter";

describe("RateLimiter", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // 케이스 1: 연속 2회 acquire() → 두 번째는 ≥7초 대기
  it("연속 2회 호출 시 두 번째는 minIntervalMs 이상 대기한다", async () => {
    const limiter = new RateLimiter(7000);

    // 첫 번째 acquire: 즉시 완료
    const p1 = limiter.acquire();
    await jest.runAllTimersAsync();
    await p1;

    // 두 번째 acquire: 7초 대기 필요
    let resolved = false;
    const p2 = limiter.acquire().then(() => {
      resolved = true;
    });

    // 6999ms 경과 → 아직 미완료
    jest.advanceTimersByTime(6999);
    await Promise.resolve(); // microtask flush
    expect(resolved).toBe(false);

    // 나머지 1ms 진행 → 완료
    jest.advanceTimersByTime(1);
    await jest.runAllTimersAsync();
    await p2;
    expect(resolved).toBe(true);
  });

  // 케이스 2: 7초 이상 간격 → 즉시 반환
  it("마지막 호출 후 minIntervalMs 이상 경과하면 즉시 반환한다", async () => {
    const limiter = new RateLimiter(7000);

    // 첫 번째 호출
    const p1 = limiter.acquire();
    await jest.runAllTimersAsync();
    await p1;

    // 8초 경과 후 두 번째 호출
    jest.advanceTimersByTime(8000);

    let resolved = false;
    const p2 = limiter.acquire().then(() => {
      resolved = true;
    });

    // 추가 타이머 진행 없이 바로 완료
    await jest.runAllTimersAsync();
    await p2;
    expect(resolved).toBe(true);
  });

  // 케이스 3: 3회 연속 → 총 대기 시간 ≥14초 (두 번째에 7초, 세 번째에 7초)
  it("3회 연속 호출 시 총 누적 대기 시간은 14초 이상이다", async () => {
    const limiter = new RateLimiter(7000);
    const timestamps: number[] = [];

    const recordTime = () => {
      timestamps.push(Date.now());
    };

    const p1 = limiter.acquire().then(recordTime);
    const p2 = limiter.acquire().then(recordTime);
    const p3 = limiter.acquire().then(recordTime);

    await jest.runAllTimersAsync();
    await Promise.all([p1, p2, p3]);

    expect(timestamps).toHaveLength(3);
    // 세 번째 완료 시각 - 첫 번째 완료 시각 >= 14초
    const totalElapsed = timestamps[2] - timestamps[0];
    expect(totalElapsed).toBeGreaterThanOrEqual(14000);
  });
});
