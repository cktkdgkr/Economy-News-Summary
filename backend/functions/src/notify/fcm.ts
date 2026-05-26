import * as admin from "firebase-admin";
import { DailyDigest } from "../digest/model";
import { buildFcmPayload } from "./payload";

const TOPIC = "economy-news";

export async function sendDigestNotification(digest: DailyDigest): Promise<string> {
  const payload = buildFcmPayload(digest);

  const message: admin.messaging.Message = {
    topic: TOPIC,
    data: payload as unknown as Record<string, string>,
  };

  try {
    const messageId = await admin.messaging().send(message);
    console.log(JSON.stringify({ step: "fcm_send", status: "success", messageId, topic: TOPIC }));
    return messageId;
  } catch (err) {
    console.error(JSON.stringify({ step: "fcm_send", status: "error", error: String(err), topic: TOPIC }));
    throw err;
  }
}
