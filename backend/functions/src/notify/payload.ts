import { DailyDigest } from "../digest/model";

export interface FcmPayload {
  digest_id: string;
  date_kst: string;
  headline: string;
  items_json: string;
  total_count: string;
  created_at: string;
  payload_overflow: string;
}

export const MAX_PAYLOAD_BYTES = 4096;

export function buildFcmPayload(digest: DailyDigest): FcmPayload {
  const base: FcmPayload = {
    digest_id: digest.dateKst,
    date_kst: digest.dateKst,
    headline: digest.headline,
    items_json: JSON.stringify(digest.items.slice(0, 5)),
    total_count: String(digest.articleCount),
    created_at: digest.createdAt,
    payload_overflow: "false",
  };

  const size = Buffer.byteLength(JSON.stringify(base), "utf8");
  if (size > MAX_PAYLOAD_BYTES) {
    return {
      ...base,
      items_json: "[]",
      payload_overflow: "true",
    };
  }

  return base;
}

export function measurePayloadBytes(payload: FcmPayload): number {
  return Buffer.byteLength(JSON.stringify(payload), "utf8");
}
