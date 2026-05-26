/** 10 RPM 준수를 위한 토큰 버킷 (호출 사이 최소 7초 간격). */
export class RateLimiter {
  private lastCallTime = 0;
  private queue: Array<() => void> = [];
  private processing = false;

  constructor(private readonly minIntervalMs: number) {}

  acquire(): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push(resolve);
      if (!this.processing) {
        void this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    this.processing = true;
    while (this.queue.length > 0) {
      const now = Date.now();
      const elapsed = now - this.lastCallTime;
      const remaining = this.minIntervalMs - elapsed;

      if (remaining > 0) {
        await sleep(remaining);
      }

      this.lastCallTime = Date.now();
      const resolve = this.queue.shift();
      resolve?.();
    }
    this.processing = false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 모듈 레벨 싱글턴 (10 RPM = 최소 7초 간격). */
export const defaultRateLimiter = new RateLimiter(7000);
