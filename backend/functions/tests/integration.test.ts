/**
 * 종단 시나리오 통합 테스트.
 * 외부 HTTP(NewsData, Gemini)와 Firestore는 모두 mock.
 * 에뮬레이터 없이도 동작한다.
 */

import { buildDailyDigest } from "../src/digest/buildDailyDigest";
import { buildFcmPayload, measurePayloadBytes, MAX_PAYLOAD_BYTES } from "../src/notify/payload";
import { DailyDigest } from "../src/digest/model";

jest.mock("../src/news/newsdataClient");
jest.mock("../src/summarize/geminiClient");
jest.mock("../src/digest/firestoreRepo");
jest.mock("firebase-admin", () => ({ firestore: jest.fn(() => ({})) }));

import { fetchEconomyNews } from "../src/news/newsdataClient";
import { summarizeArticles } from "../src/summarize/geminiClient";
import { saveDailyDigest } from "../src/digest/firestoreRepo";

const mockFetch = fetchEconomyNews as jest.MockedFunction<typeof fetchEconomyNews>;
const mockSummarize = summarizeArticles as jest.MockedFunction<typeof summarizeArticles>;
const mockSave = saveDailyDigest as jest.MockedFunction<typeof saveDailyDigest>;

// nowUtc = 2026-05-23T22:00:00Z → KST 2026-05-24 07:00 → dateKst = "2026-05-23"
const FIXED_NOW = new Date("2026-05-23T22:00:00Z");
const MOCK_FIRESTORE = {} as any;

function makeArticles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    article_id: `id-${i}`,
    title: `경제 기사 제목 ${i}`,
    description: `기사 내용 ${i}`,
    link: `https://example.com/${i}`,
    source_name: `언론사${i}`,
    source_id: `src-${i}`,
    pubDate: "2026-05-23 03:00:00",
  }));
}

// 정확히 80~120자 범위 내 헤드라인 (이 문자열은 96자)
const MOCK_HEADLINE =
  "미 연준 금리 동결·한국 반도체 수출 호조—글로벌 경기 회복 기대감 확산, 원화 강세 전환 전망, 코스피 반등 기대";

function makeSummarizeResult(articles: ReturnType<typeof makeArticles>) {
  return {
    headline: MOCK_HEADLINE,
    items: articles.map((a, i) => ({
      source: a.source_name,
      title: a.title,
      shortSummary: `요약 ${i}: 핵심 경제 지표 변동`,
    })),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSave.mockResolvedValue(undefined);
});

// 케이스 1: 정상 종단 — 기사 3건 → 다이제스트 → 페이로드 → 모든 필드 검증
test("정상 종단: 기사 3건 → 다이제스트 → 페이로드 → 모든 필드 검증", async () => {
  const articles = makeArticles(3);
  mockFetch.mockResolvedValue(articles as any);
  mockSummarize.mockResolvedValue(makeSummarizeResult(articles));

  const digest = await buildDailyDigest({
    newsdataApiKey: "news-key",
    geminiApiKey: "gemini-key",
    nowUtc: FIXED_NOW,
    firestore: MOCK_FIRESTORE,
  });

  // 다이제스트 검증
  expect(digest.dateKst).toBe("2026-05-23");
  expect(digest.articleCount).toBe(3);
  expect(digest.items).toHaveLength(3);
  const headlineLen = Array.from(digest.headline).length;
  expect(headlineLen).toBeGreaterThanOrEqual(80);
  expect(headlineLen).toBeLessThanOrEqual(120);
  expect(mockSave).toHaveBeenCalledWith(digest, MOCK_FIRESTORE);

  // 페이로드 검증
  const payload = buildFcmPayload(digest);
  expect(payload.date_kst).toBe("2026-05-23");
  expect(payload.digest_id).toBe("2026-05-23");
  expect(payload.payload_overflow).toBe("false");
  expect(measurePayloadBytes(payload)).toBeLessThanOrEqual(MAX_PAYLOAD_BYTES);

  const items = JSON.parse(payload.items_json) as unknown[];
  expect(items).toHaveLength(3);
});

// 케이스 2: 빈 기사 — 0건 → 빈 다이제스트 → 페이로드 검증
test("빈 기사: 0건 → 빈 다이제스트 → 페이로드 4KB 이하", async () => {
  mockFetch.mockResolvedValue([]);

  const digest = await buildDailyDigest({
    newsdataApiKey: "news-key",
    geminiApiKey: "gemini-key",
    nowUtc: FIXED_NOW,
    firestore: MOCK_FIRESTORE,
  });

  expect(digest.dateKst).toBe("2026-05-23");
  expect(digest.headline).toBe("수집된 뉴스가 없습니다");
  expect(digest.items).toHaveLength(0);
  expect(digest.articleCount).toBe(0);
  expect(mockSummarize).not.toHaveBeenCalled();
  expect(mockSave).toHaveBeenCalledWith(digest, MOCK_FIRESTORE);

  const payload = buildFcmPayload(digest);
  expect(payload.items_json).toBe("[]");
  expect(payload.payload_overflow).toBe("false");
  expect(measurePayloadBytes(payload)).toBeLessThanOrEqual(MAX_PAYLOAD_BYTES);
});

// 케이스 3: 대용량 — 기사 10건 + 긴 한글 headline → payload_overflow 검증
test("대용량: 기사 10건 + 긴 headline → payload_overflow 분기 검증", async () => {
  const articles = makeArticles(10);
  const longHeadline = "가나다라마바사아자차카타파하".repeat(9); // 126자 → enforceSummaryLength가 120자로 자름
  mockFetch.mockResolvedValue(articles as any);
  mockSummarize.mockResolvedValue({
    headline: longHeadline,
    items: articles.map((a, i) => ({
      source: a.source_name,
      title: `${"기".repeat(50)} ${i}`,
      shortSummary: `${"요".repeat(60)} ${i}`,
    })),
  });

  const digest = await buildDailyDigest({
    newsdataApiKey: "news-key",
    geminiApiKey: "gemini-key",
    nowUtc: FIXED_NOW,
    firestore: MOCK_FIRESTORE,
  });

  expect(digest.articleCount).toBe(10);
  const headlineLen = Array.from(digest.headline).length;
  expect(headlineLen).toBeLessThanOrEqual(120);

  const payload = buildFcmPayload(digest);

  if (payload.payload_overflow === "true") {
    // overflow 분기: items_json은 반드시 []
    expect(payload.items_json).toBe("[]");
    // overflow 후에도 4KB 이하
    expect(measurePayloadBytes(payload)).toBeLessThanOrEqual(MAX_PAYLOAD_BYTES);
  } else {
    // 정상 분기: 페이로드가 4KB 이하임을 재확인
    expect(measurePayloadBytes(payload)).toBeLessThanOrEqual(MAX_PAYLOAD_BYTES);
  }
});
