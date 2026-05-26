import * as admin from "firebase-admin";
import { Firestore } from "@google-cloud/firestore";
import { getKstWindow } from "../time/kstWindow";
import { fetchEconomyNews } from "../news/newsdataClient";
import { summarizeArticles } from "../summarize/geminiClient";
import { enforceSummaryLength } from "../summarize/lengthEnforcer";
import { saveDailyDigest } from "./firestoreRepo";
import { DailyDigest } from "./model";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export interface BuildParams {
  newsdataApiKey: string;
  geminiApiKey: string;
  nowUtc?: Date;
  firestore?: Firestore;
}

function toDateKst(utcDate: Date): string {
  const kst = new Date(utcDate.getTime() + KST_OFFSET_MS);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function buildDailyDigest(params: BuildParams): Promise<DailyDigest> {
  const {
    newsdataApiKey,
    geminiApiKey,
    nowUtc = new Date(),
    firestore = admin.firestore(),
  } = params;

  // Step 1: KST 윈도 계산
  const { start, end } = getKstWindow(nowUtc);
  const dateKst = toDateKst(start);

  console.log(
    JSON.stringify({ step: "kstWindow", status: "ok", dateKst, windowStart: start.toISOString(), windowEnd: end.toISOString() }),
  );

  // Step 2: 뉴스 수집
  let articles: Awaited<ReturnType<typeof fetchEconomyNews>>;
  try {
    articles = await fetchEconomyNews({ apiKey: newsdataApiKey, start, end });
  } catch (err) {
    console.log(
      JSON.stringify({ step: "fetchNews", status: "error", error: String(err) }),
    );
    throw err;
  }

  console.log(
    JSON.stringify({ step: "fetchNews", status: "ok", articleCount: articles.length }),
  );

  const createdAt = nowUtc.toISOString();
  const expiresAt = new Date(nowUtc.getTime() + NINETY_DAYS_MS).toISOString();
  const windowStart = start.toISOString();
  const windowEnd = end.toISOString();

  // Step 3: 기사 0건 처리
  if (articles.length === 0) {
    console.warn(
      JSON.stringify({ step: "fetchNews", status: "warn", message: "수집된 기사가 없습니다" }),
    );

    const emptyDigest: DailyDigest = {
      dateKst,
      headline: "수집된 뉴스가 없습니다",
      items: [],
      windowStart,
      windowEnd,
      articleCount: 0,
      createdAt,
      expiresAt,
    };

    await saveDailyDigest(emptyDigest, firestore);
    return emptyDigest;
  }

  // Step 4: 요약 입력 변환
  const summarizeInput = {
    articles: articles.map((a) => ({
      title: a.title,
      description: a.description ?? "",
      source: a.source_name ?? a.source_id ?? "",
    })),
  };

  // Step 5: 요약 실행
  let summarizeResult: Awaited<ReturnType<typeof summarizeArticles>>;
  try {
    summarizeResult = await summarizeArticles(summarizeInput, geminiApiKey);
  } catch (err) {
    console.log(
      JSON.stringify({ step: "summarize", status: "error", error: String(err) }),
    );
    throw err;
  }

  console.log(
    JSON.stringify({ step: "summarize", status: "ok", itemCount: summarizeResult.items.length }),
  );

  // Step 6: 헤드라인 길이 검증
  const headline = enforceSummaryLength(summarizeResult.headline, { min: 80, max: 120 });

  // Step 7: DailyDigest 객체 구성
  const digest: DailyDigest = {
    dateKst,
    headline,
    items: summarizeResult.items.map((item) => ({
      source: item.source,
      title: item.title,
      shortSummary: item.shortSummary,
    })),
    windowStart,
    windowEnd,
    articleCount: articles.length,
    createdAt,
    expiresAt,
  };

  // Step 8: Firestore 저장
  try {
    await saveDailyDigest(digest, firestore);
  } catch (err) {
    console.log(
      JSON.stringify({ step: "firestoreSave", status: "error", error: String(err) }),
    );
    throw err;
  }

  console.log(
    JSON.stringify({ step: "firestoreSave", status: "ok", dateKst }),
  );

  return digest;
}
