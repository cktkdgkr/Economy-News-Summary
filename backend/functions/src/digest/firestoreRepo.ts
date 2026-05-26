import * as admin from "firebase-admin";
import { Firestore, Timestamp } from "@google-cloud/firestore";
import { DailyDigest } from "./model";

const COLLECTION = "digests";

/**
 * DailyDigest를 Firestore에 멱등 저장한다.
 * 문서 ID = digest.dateKst (예: "2026-05-22").
 * 동일 일자 재실행 시 set({ merge: true })로 덮어쓴다.
 */
export async function saveDailyDigest(
  digest: DailyDigest,
  db: Firestore = admin.firestore(),
): Promise<void> {
  const docRef = db.collection(COLLECTION).doc(digest.dateKst);

  await docRef.set(
    {
      ...digest,
      expiresAt: Timestamp.fromDate(new Date(digest.expiresAt)),
      createdAt: Timestamp.fromDate(new Date(digest.createdAt)),
    },
    { merge: true },
  );
}
