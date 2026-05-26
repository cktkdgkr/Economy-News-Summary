import { summarizeArticles, PRIMARY_MODEL, FALLBACK_MODEL, GenAIFactory } from "../src/summarize/geminiClient";
import { GoogleGenAI } from "@google/genai";

// RateLimiter를 bypass해 테스트 속도를 높임
jest.mock("../src/summarize/rateLimiter", () => ({
  defaultRateLimiter: { acquire: jest.fn().mockResolvedValue(undefined) },
}));

const SAMPLE_INPUT = {
  articles: [
    { title: "미국 금리 인상", description: "연준이 기준금리를 0.25%p 올렸다.", source: "연합뉴스" },
    { title: "한국 수출 증가", description: "반도체 수출이 전월 대비 10% 늘었다.", source: "한국경제" },
  ],
};

const VALID_RESPONSE = JSON.stringify({
  headline: "미 연준 금리 인상·한국 반도체 수출 호조—글로벌 경기 회복 기대감 확산, 원화 강세 전환 전망",
  items: [
    { source: "연합뉴스", title: "미국 금리 인상", shortSummary: "연준, 기준금리 0.25%p 인상 결정" },
    { source: "한국경제", title: "한국 수출 증가", shortSummary: "반도체 수출 전월비 10% 증가" },
  ],
});

function makeFactory(mockGenerateContent: jest.Mock): GenAIFactory {
  return (_apiKey: string) =>
    ({
      models: { generateContent: mockGenerateContent },
    }) as unknown as GoogleGenAI;
}

// 케이스 1: 정상 응답 → headline + items 파싱 성공
it("정상 응답을 파싱하여 SummarizeResult를 반환한다", async () => {
  const mockGenerate = jest.fn().mockResolvedValue({ text: VALID_RESPONSE });
  const factory = makeFactory(mockGenerate);

  const result = await summarizeArticles(SAMPLE_INPUT, "test-api-key", factory);

  expect(result.headline).toContain("금리");
  expect(result.items).toHaveLength(2);
  expect(result.items[0].source).toBe("연합뉴스");
  expect(result.items[1].shortSummary).toContain("10%");
  // 1차 모델로 호출됐는지 확인
  expect(mockGenerate).toHaveBeenCalledWith(
    expect.objectContaining({ model: PRIMARY_MODEL }),
  );
});

// 케이스 2: 429 응답 → 재시도 후 성공
it("429 에러 후 재시도하여 성공한다", async () => {
  jest.useFakeTimers();

  const mockGenerate = jest
    .fn()
    .mockRejectedValueOnce(new Error("429 Too Many Requests"))
    .mockRejectedValueOnce(new Error("429 Too Many Requests"))
    .mockResolvedValueOnce({ text: VALID_RESPONSE });

  const factory = makeFactory(mockGenerate);

  // 타이머를 자동으로 진행시켜 setTimeout 대기를 즉시 처리
  const promise = summarizeArticles(SAMPLE_INPUT, "test-api-key", factory);
  // 지수 백오프 타이머 (1s + 2s) 진행
  await jest.runAllTimersAsync();

  const result = await promise;

  expect(result.headline).toBeTruthy();
  // 3번 호출됨: 첫 번째 실패, 두 번째 실패, 세 번째 성공
  expect(mockGenerate).toHaveBeenCalledTimes(3);

  jest.useRealTimers();
});

// 케이스 3: 영구 실패 → 폴백 모델 시도 → 그래도 실패 → throw
it("주 모델 4회 실패 후 폴백 모델 시도, 폴백도 실패하면 throw한다", async () => {
  jest.useFakeTimers();

  const permanentError = new Error("503 Service Unavailable");
  const mockGenerate = jest.fn().mockRejectedValue(permanentError);

  const factory = makeFactory(mockGenerate);

  let caughtError: unknown;
  const promise = summarizeArticles(SAMPLE_INPUT, "test-api-key", factory).catch(
    (err) => { caughtError = err; },
  );
  await jest.runAllTimersAsync();
  await promise;

  expect(caughtError).toBeDefined();
  expect((caughtError as Error).message).toContain("503");

  // PRIMARY_MODEL 4회 + FALLBACK_MODEL 1회 = 총 5회 호출
  expect(mockGenerate).toHaveBeenCalledTimes(5);
  const calls = mockGenerate.mock.calls as Array<[{ model: string }]>;
  const models = calls.map((c) => c[0].model);
  expect(models.slice(0, 4).every((m) => m === PRIMARY_MODEL)).toBe(true);
  expect(models[4]).toBe(FALLBACK_MODEL);

  jest.useRealTimers();
});
