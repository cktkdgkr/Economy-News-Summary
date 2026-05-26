import { buildDailyDigest } from "../src/digest/buildDailyDigest";
import { DailyDigest } from "../src/digest/model";

// 모든 외부 의존성 mock
jest.mock("../src/news/newsdataClient");
jest.mock("../src/summarize/geminiClient");
jest.mock("../src/digest/firestoreRepo");
jest.mock("../src/time/kstWindow");
jest.mock("firebase-admin", () => ({
  firestore: jest.fn(() => ({})),
}));

import { fetchEconomyNews } from "../src/news/newsdataClient";
import { summarizeArticles } from "../src/summarize/geminiClient";
import { saveDailyDigest } from "../src/digest/firestoreRepo";
import { getKstWindow } from "../src/time/kstWindow";

const mockFetchEconomyNews = fetchEconomyNews as jest.MockedFunction<typeof fetchEconomyNews>;
const mockSummarizeArticles = summarizeArticles as jest.MockedFunction<typeof summarizeArticles>;
const mockSaveDailyDigest = saveDailyDigest as jest.MockedFunction<typeof saveDailyDigest>;
const mockGetKstWindow = getKstWindow as jest.MockedFunction<typeof getKstWindow>;

const FIXED_NOW = new Date("2026-05-23T22:00:00Z"); // KST 2026-05-24 07:00
const FIXED_WINDOW_START = new Date("2026-05-22T15:00:00Z"); // KST 2026-05-23 00:00
const FIXED_WINDOW_END = new Date("2026-05-23T15:00:00Z");   // KST 2026-05-24 00:00

const MOCK_ARTICLES = Array.from({ length: 5 }, (_, i) => ({
  article_id: `id-${i}`,
  title: `기사 제목 ${i}`,
  description: `기사 설명 ${i}`,
  link: `https://example.com/${i}`,
  source_name: `언론사${i}`,
  source_id: `src-${i}`,
  pubDate: "2026-05-23 03:00:00",
}));

const MOCK_SUMMARIZE_RESULT = {
  headline: "미 연준 금리 인상·한국 반도체 수출 호조—글로벌 경기 회복 기대감 확산, 원화 강세 전환 전망",
  items: MOCK_ARTICLES.map((a, i) => ({
    source: a.source_name,
    title: a.title,
    shortSummary: `요약 ${i}`,
  })),
};

const MOCK_FIRESTORE = {} as any;

beforeEach(() => {
  jest.clearAllMocks();

  mockGetKstWindow.mockReturnValue({
    start: FIXED_WINDOW_START,
    end: FIXED_WINDOW_END,
  });

  mockFetchEconomyNews.mockResolvedValue(MOCK_ARTICLES as any);
  mockSummarizeArticles.mockResolvedValue(MOCK_SUMMARIZE_RESULT);
  mockSaveDailyDigest.mockResolvedValue(undefined);
});

// 케이스 1: 정상 — 기사 5건 → 요약 → Firestore 저장 → DailyDigest 반환
test("기사 5건 정상 처리 후 DailyDigest를 반환한다", async () => {
  const result = await buildDailyDigest({
    newsdataApiKey: "news-key",
    geminiApiKey: "gemini-key",
    nowUtc: FIXED_NOW,
    firestore: MOCK_FIRESTORE,
  });

  expect(result).toMatchObject<Partial<DailyDigest>>({
    dateKst: "2026-05-23",
    articleCount: 5,
    windowStart: FIXED_WINDOW_START.toISOString(),
    windowEnd: FIXED_WINDOW_END.toISOString(),
  });
  expect(result.items).toHaveLength(5);
  expect(result.headline).toBeTruthy();
  expect(mockFetchEconomyNews).toHaveBeenCalledTimes(1);
  expect(mockSummarizeArticles).toHaveBeenCalledTimes(1);
  expect(mockSaveDailyDigest).toHaveBeenCalledWith(result, MOCK_FIRESTORE);
});

// 케이스 2: 빈 기사 — 0건 → 빈 다이제스트 저장, headline = "수집된 뉴스가 없습니다"
test("기사 0건이면 빈 다이제스트를 저장하고 반환한다", async () => {
  mockFetchEconomyNews.mockResolvedValue([]);

  const result = await buildDailyDigest({
    newsdataApiKey: "news-key",
    geminiApiKey: "gemini-key",
    nowUtc: FIXED_NOW,
    firestore: MOCK_FIRESTORE,
  });

  expect(result.headline).toBe("수집된 뉴스가 없습니다");
  expect(result.items).toHaveLength(0);
  expect(result.articleCount).toBe(0);
  expect(mockSummarizeArticles).not.toHaveBeenCalled();
  expect(mockSaveDailyDigest).toHaveBeenCalledWith(result, MOCK_FIRESTORE);
});

// 케이스 3: 수집 실패 — fetchEconomyNews throw → 에러 전파
test("뉴스 수집 실패 시 에러를 전파한다", async () => {
  const fetchError = new Error("NewsData API 오류");
  mockFetchEconomyNews.mockRejectedValue(fetchError);

  await expect(
    buildDailyDigest({
      newsdataApiKey: "news-key",
      geminiApiKey: "gemini-key",
      nowUtc: FIXED_NOW,
      firestore: MOCK_FIRESTORE,
    }),
  ).rejects.toThrow("NewsData API 오류");

  expect(mockSummarizeArticles).not.toHaveBeenCalled();
  expect(mockSaveDailyDigest).not.toHaveBeenCalled();
});

// 케이스 4: 요약 실패 — summarizeArticles throw → 에러 전파
test("요약 실패 시 에러를 전파한다", async () => {
  const summarizeError = new Error("Gemini API 오류");
  mockSummarizeArticles.mockRejectedValue(summarizeError);

  await expect(
    buildDailyDigest({
      newsdataApiKey: "news-key",
      geminiApiKey: "gemini-key",
      nowUtc: FIXED_NOW,
      firestore: MOCK_FIRESTORE,
    }),
  ).rejects.toThrow("Gemini API 오류");

  expect(mockSaveDailyDigest).not.toHaveBeenCalled();
});

// 케이스 5: 멱등 — 동일 dateKst로 재실행 시 saveDailyDigest가 호출됨 (merge 동작은 repo에서 보장)
test("동일 dateKst로 재실행해도 saveDailyDigest가 호출된다", async () => {
  await buildDailyDigest({
    newsdataApiKey: "news-key",
    geminiApiKey: "gemini-key",
    nowUtc: FIXED_NOW,
    firestore: MOCK_FIRESTORE,
  });

  await buildDailyDigest({
    newsdataApiKey: "news-key",
    geminiApiKey: "gemini-key",
    nowUtc: FIXED_NOW,
    firestore: MOCK_FIRESTORE,
  });

  expect(mockSaveDailyDigest).toHaveBeenCalledTimes(2);
  // 두 호출 모두 같은 dateKst를 가짐
  const firstCall = mockSaveDailyDigest.mock.calls[0][0] as DailyDigest;
  const secondCall = mockSaveDailyDigest.mock.calls[1][0] as DailyDigest;
  expect(firstCall.dateKst).toBe(secondCall.dateKst);
});

// 케이스 6: headline이 120자 초과이면 enforceSummaryLength가 잘라낸다
test("headline이 120자 초과이면 잘라낸다", async () => {
  const longHeadline = "가".repeat(130); // 130자
  mockSummarizeArticles.mockResolvedValue({
    ...MOCK_SUMMARIZE_RESULT,
    headline: longHeadline,
  });

  const result = await buildDailyDigest({
    newsdataApiKey: "news-key",
    geminiApiKey: "gemini-key",
    nowUtc: FIXED_NOW,
    firestore: MOCK_FIRESTORE,
  });

  const len = Array.from(result.headline).length;
  expect(len).toBeLessThanOrEqual(120);
});

// 케이스 7: expiresAt이 createdAt + 90일인지 확인
test("expiresAt은 createdAt에서 90일 후이다", async () => {
  const result = await buildDailyDigest({
    newsdataApiKey: "news-key",
    geminiApiKey: "gemini-key",
    nowUtc: FIXED_NOW,
    firestore: MOCK_FIRESTORE,
  });

  const createdMs = new Date(result.createdAt).getTime();
  const expiresMs = new Date(result.expiresAt).getTime();
  const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

  expect(expiresMs - createdMs).toBe(NINETY_DAYS_MS);
});
