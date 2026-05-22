import { onRequest } from "firebase-functions/v2/https";

export const helloWorld = onRequest(
  { region: "asia-northeast3" },
  (_req, res) => {
    res.send("hello from economy-news-summary");
  },
);
