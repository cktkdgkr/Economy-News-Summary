import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompts";
import { defaultRateLimiter } from "./rateLimiter";

export const PRIMARY_MODEL =
  process.env["GEMINI_MODEL"] ?? "gemini-2.5-flash";
export const FALLBACK_MODEL = "gemini-2.0-flash";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export interface SummarizeInput {
  articles: Array<{ title: string; description: string; source: string }>;
}

export interface SummarizeResult {
  headline: string;
  items: Array<{
    source: string;
    title: string;
    shortSummary: string;
  }>;
}

/** 의존성 주입을 위한 SDK 팩토리 타입. */
export type GenAIFactory = (apiKey: string) => GoogleGenAI;

const defaultFactory: GenAIFactory = (apiKey) => new GoogleGenAI({ apiKey });

function isRetryableError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    // 429, 500, 502, 503, 504, 타임아웃
    return /429|500|502|503|504|timeout|econnreset|econnrefused/.test(msg);
  }
  return false;
}

async function callModel(
  ai: GoogleGenAI,
  model: string,
  input: SummarizeInput,
): Promise<SummarizeResult> {
  const response = await ai.models.generateContent({
    model,
    contents: buildUserPrompt(input.articles),
    config: {
      systemInstruction: SYSTEM_PROMPT,
      maxOutputTokens: 1024,
      temperature: 0.3,
      responseMimeType: "application/json",
    },
  });

  const raw = response.text;
  if (!raw) {
    throw new Error("Gemini 응답이 비어 있습니다.");
  }

  return parseResponse(raw);
}

function parseResponse(raw: string): SummarizeResult {
  let parsed: unknown;
  try {
    // JSON 모드 응답 또는 마크다운 코드블록 제거 후 파싱
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Gemini 응답 JSON 파싱 실패: ${raw.slice(0, 200)}`);
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>)["headline"] !== "string" ||
    !Array.isArray((parsed as Record<string, unknown>)["items"])
  ) {
    throw new Error("Gemini 응답 구조가 예상과 다릅니다.");
  }

  const { headline, items } = parsed as {
    headline: string;
    items: Array<Record<string, unknown>>;
  };

  return {
    headline,
    items: items.map((item) => ({
      source: String(item["source"] ?? ""),
      title: String(item["title"] ?? ""),
      shortSummary: String(item["shortSummary"] ?? ""),
    })),
  };
}

async function withRetry(
  fn: () => Promise<SummarizeResult>,
): Promise<SummarizeResult> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRetryableError(err)) throw err;
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt); // 1s, 2s, 4s
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

/**
 * 기사 배열을 Gemini API로 요약한다.
 * @param input   요약 대상 기사 목록
 * @param apiKey  Gemini API 키 (코드/로그에 노출하지 않음)
 * @param factory 테스트 의존성 주입용 SDK 팩토리 (기본값: GoogleGenAI 생성자)
 */
export async function summarizeArticles(
  input: SummarizeInput,
  apiKey: string,
  factory: GenAIFactory = defaultFactory,
): Promise<SummarizeResult> {
  await defaultRateLimiter.acquire();

  const ai = factory(apiKey);

  // 1차 시도: PRIMARY_MODEL + 지수 백오프 재시도 3회
  try {
    return await withRetry(() => callModel(ai, PRIMARY_MODEL, input));
  } catch {
    // 폴백: FALLBACK_MODEL 1회 시도
    return await callModel(ai, FALLBACK_MODEL, input);
  }
}
