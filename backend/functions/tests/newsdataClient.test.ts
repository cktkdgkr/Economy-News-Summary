import {
  fetchEconomyNews,
  RateLimitError,
  NewsDataApiError,
} from "../src/news/newsdataClient";

const START = new Date("2026-05-21T15:00:00Z");
const END = new Date("2026-05-22T15:00:00Z");

/** pubDate는 윈도 안에 있어야 필터를 통과한다 */
const PUB_DATE_IN_WINDOW = "2026-05-22 03:00:00"; // UTC → KST 12:00

function makeArticle(id: string, overrides: Record<string, unknown> = {}) {
  return {
    article_id: id,
    title: `테스트 기사 ${id}`,
    description: "설명",
    link: `https://example.com/${id}`,
    source_name: "테스트언론",
    pubDate: PUB_DATE_IN_WINDOW,
    category: ["business"],
    language: "ko",
    country: ["kr"],
    ...overrides,
  };
}

function makeResponse(
  results: unknown[],
  nextPage: string | null = null,
): Response {
  const body = JSON.stringify({ status: "success", results, nextPage });
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// 케이스 1: 정상 응답(기사 3건) → 3건 반환
test("정상 응답 3건을 반환한다", async () => {
  const mockFetch = jest.fn().mockResolvedValue(
    makeResponse([makeArticle("a1"), makeArticle("a2"), makeArticle("a3")]),
  );

  const articles = await fetchEconomyNews({
    apiKey: "test-key",
    start: START,
    end: END,
    fetchFn: mockFetch,
  });

  expect(articles).toHaveLength(3);
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

// 케이스 2: 빈 응답(기사 0건) → 빈 배열
test("빈 응답이면 빈 배열을 반환한다", async () => {
  const mockFetch = jest.fn().mockResolvedValue(makeResponse([]));

  const articles = await fetchEconomyNews({
    apiKey: "test-key",
    start: START,
    end: END,
    fetchFn: mockFetch,
  });

  expect(articles).toHaveLength(0);
});

// 케이스 3: 부분 검증 실패(5건 중 2건 필드 누락) → 유효 3건 반환
test("스키마 검증 실패 기사는 건너뛰고 유효 기사만 반환한다", async () => {
  const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

  const results = [
    makeArticle("v1"),
    makeArticle("v2"),
    makeArticle("v3"),
    // article_id 누락 → 검증 실패
    { title: "누락기사1", link: "https://a.com", pubDate: PUB_DATE_IN_WINDOW },
    // title 누락 → 검증 실패
    {
      article_id: "bad2",
      link: "https://b.com",
      pubDate: PUB_DATE_IN_WINDOW,
    },
  ];
  const mockFetch = jest.fn().mockResolvedValue(makeResponse(results));

  const articles = await fetchEconomyNews({
    apiKey: "test-key",
    start: START,
    end: END,
    fetchFn: mockFetch,
  });

  expect(articles).toHaveLength(3);
  expect(warnSpy).toHaveBeenCalledTimes(2);
  warnSpy.mockRestore();
});

// 케이스 4: HTTP 429 → RateLimitError
test("HTTP 429이면 RateLimitError를 던진다", async () => {
  const mockFetch = jest
    .fn()
    .mockResolvedValue(new Response("Too Many Requests", { status: 429 }));

  await expect(
    fetchEconomyNews({
      apiKey: "test-key",
      start: START,
      end: END,
      fetchFn: mockFetch,
    }),
  ).rejects.toThrow(RateLimitError);
});

// 케이스 5: HTTP 500 → NewsDataApiError
test("HTTP 500이면 NewsDataApiError를 던진다", async () => {
  const mockFetch = jest
    .fn()
    .mockResolvedValue(
      new Response("Internal Server Error", { status: 500, statusText: "Internal Server Error" }),
    );

  await expect(
    fetchEconomyNews({
      apiKey: "test-key",
      start: START,
      end: END,
      fetchFn: mockFetch,
    }),
  ).rejects.toThrow(NewsDataApiError);
});

// 케이스 6: 페이지네이션 — nextPage 토큰이 있으면 2페이지까지 호출
test("nextPage 토큰이 있으면 다음 페이지를 이어서 호출한다", async () => {
  const page1 = makeResponse([makeArticle("p1-1"), makeArticle("p1-2")], "TOKEN_PAGE2");
  const page2 = makeResponse([makeArticle("p2-1")], null);

  const mockFetch = jest
    .fn()
    .mockResolvedValueOnce(page1)
    .mockResolvedValueOnce(page2);

  const articles = await fetchEconomyNews({
    apiKey: "test-key",
    start: START,
    end: END,
    fetchFn: mockFetch,
  });

  expect(articles).toHaveLength(3);
  expect(mockFetch).toHaveBeenCalledTimes(2);

  // 두 번째 호출 URL에 page 파라미터가 포함되어야 한다
  const secondCallUrl: string = mockFetch.mock.calls[1][0] as string;
  expect(secondCallUrl).toContain("page=TOKEN_PAGE2");
});

// 케이스 7: 페이지네이션 하드캡 — 3페이지 초과 시 중단
test("페이지네이션은 최대 3페이지에서 중단한다", async () => {
  const mockFetch = jest.fn().mockImplementation(() =>
    Promise.resolve(
      makeResponse([makeArticle("x1")], "NEXT_TOKEN"),
    ),
  );

  const articles = await fetchEconomyNews({
    apiKey: "test-key",
    start: START,
    end: END,
    fetchFn: mockFetch,
  });

  // 3페이지까지만 호출 (nextPage가 계속 있어도 중단)
  expect(mockFetch).toHaveBeenCalledTimes(3);
  expect(articles).toHaveLength(3);
});
