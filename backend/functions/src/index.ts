import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { buildDailyDigest } from "./digest/buildDailyDigest";
import { newsdataApiKey, geminiApiKey } from "./secrets";

export const helloWorld = onRequest(
  { region: "asia-northeast3" },
  (_req, res) => {
    res.send("hello from economy-news-summary");
  },
);

export const dailyDigest = onSchedule(
  {
    schedule: "0 7 * * *",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    retryCount: 3,
    memory: "512MiB",
    timeoutSeconds: 120,
    secrets: [newsdataApiKey, geminiApiKey],
  },
  async () => {
    const newsdataApiKey = process.env.NEWSDATA_API_KEY ?? "";
    const geminiApiKey = process.env.GEMINI_API_KEY ?? "";

    await buildDailyDigest({
      newsdataApiKey,
      geminiApiKey,
    });
  },
);
