import { newsArticleSchema, newsDataResponseSchema, NewsArticle } from "./dto";

/** NewsData.io 일일 요청 한도 가드: 페이지네이션 최대 3회 */
const MAX_PAGES = 3;

const BASE_URL = "https://newsdata.io/api/1/latest";

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

export class NewsDataApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "NewsDataApiError";
  }
}

type FetchFn = typeof globalThis.fetch;

export async function fetchEconomyNews(params: {
  apiKey: string;
  start: Date;
  end: Date;
  fetchFn?: FetchFn;
}): Promise<NewsArticle[]> {
  const { apiKey, start, end, fetchFn = globalThis.fetch } = params;

  const articles: NewsArticle[] = [];
  let nextPage: string | null | undefined = undefined;
  let pageCount = 0;

  do {
    const url = buildUrl(apiKey, nextPage ?? undefined);
    const response = await fetchFn(url);

    if (response.status === 429) {
      throw new RateLimitError(
        "NewsData.io 요청 한도 초과 (HTTP 429). 다음 날 다시 시도하세요.",
      );
    }

    if (!response.ok) {
      throw new NewsDataApiError(
        response.status,
        `NewsData.io API 오류 (HTTP ${response.status}): ${response.statusText}`,
      );
    }

    const json: unknown = await response.json();
    const parsed = newsDataResponseSchema.safeParse(json);

    if (!parsed.success) {
      throw new NewsDataApiError(
        200,
        `NewsData.io 응답 구조 파싱 실패: ${parsed.error.message}`,
      );
    }

    const results = parsed.data.results ?? [];

    for (const raw of results) {
      const result = newsArticleSchema.safeParse(raw);
      if (result.success) {
        const article = result.data;
        // 클라이언트 측 시간 필터: pubDate가 KST 윈도 범위 내인지 확인
        if (isInWindow(article.pubDate, start, end)) {
          articles.push(article);
        }
      } else {
        console.warn(
          "[newsdataClient] 기사 스키마 검증 실패, 건너뜀:",
          result.error.flatten().fieldErrors,
        );
      }
    }

    nextPage = parsed.data.nextPage;
    pageCount++;
  } while (nextPage && pageCount < MAX_PAGES);

  return articles;
}

function buildUrl(apiKey: string, page?: string): string {
  const params = new URLSearchParams({
    apikey: apiKey,
    country: "kr",
    language: "ko",
    category: "business",
  });

  if (page) {
    params.set("page", page);
  }

  return `${BASE_URL}?${params.toString()}`;
}

/**
 * pubDate 문자열이 [start, end) 범위에 속하는지 확인.
 * NewsData.io pubDate 형식: "YYYY-MM-DD HH:MM:SS" (UTC 기준).
 * 12시간 지연 정책: pubDate 기준으로 판단하며 지연 자체는 정상으로 간주.
 */
function isInWindow(pubDate: string, start: Date, end: Date): boolean {
  const pub = new Date(pubDate.replace(" ", "T") + "Z");
  if (isNaN(pub.getTime())) {
    return true; // 날짜 파싱 실패 시 필터 통과 (보수적)
  }
  return pub >= start && pub < end;
}
