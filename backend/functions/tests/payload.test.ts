import { buildFcmPayload, measurePayloadBytes, MAX_PAYLOAD_BYTES, FcmPayload } from "../src/notify/payload";
import { DailyDigest, DigestItem } from "../src/digest/model";

function makeDigest(overrides: Partial<DailyDigest> = {}): DailyDigest {
  return {
    dateKst: "2026-05-24",
    headline: "미 연준 금리 동결·한국 반도체 수출 호조—글로벌 경기 회복 기대감 확산",
    items: [
      { source: "연합뉴스", title: "연준 금리 동결", shortSummary: "연준이 금리를 동결했다" },
      { source: "한국경제", title: "반도체 수출 호조", shortSummary: "반도체 수출이 증가했다" },
      { source: "매일경제", title: "원화 강세 전망", shortSummary: "원화가 강세로 전환될 전망이다" },
    ],
    windowStart: "2026-05-23T15:00:00.000Z",
    windowEnd: "2026-05-24T15:00:00.000Z",
    articleCount: 3,
    createdAt: "2026-05-24T22:00:00.000Z",
    expiresAt: "2026-08-22T22:00:00.000Z",
    ...overrides,
  };
}

function makeItems(count: number): DigestItem[] {
  return Array.from({ length: count }, (_, i) => ({
    source: `언론사${i}`,
    title: `기사 제목 ${i}`,
    shortSummary: `요약 ${i}`,
  }));
}

// 케이스 1: 정상 다이제스트(3건) → 페이로드 4KB 이하, overflow=false
test("정상 다이제스트(3건) 페이로드는 4KB 이하이고 overflow=false이다", () => {
  const digest = makeDigest();
  const payload = buildFcmPayload(digest);

  expect(measurePayloadBytes(payload)).toBeLessThanOrEqual(MAX_PAYLOAD_BYTES);
  expect(payload.payload_overflow).toBe("false");
  expect(payload.digest_id).toBe("2026-05-24");
  expect(payload.date_kst).toBe("2026-05-24");
});

// 케이스 2: 기사 7건 → items_json에 최대 5건만 포함
test("기사 7건이면 items_json에 최대 5건만 포함된다", () => {
  const digest = makeDigest({ items: makeItems(7), articleCount: 7 });
  const payload = buildFcmPayload(digest);

  const items = JSON.parse(payload.items_json) as DigestItem[];
  expect(items).toHaveLength(5);
});

// 케이스 3: 빈 items → items_json="[]", overflow=false
test("빈 items이면 items_json=[] 이고 overflow=false이다", () => {
  const digest = makeDigest({ items: [], articleCount: 0 });
  const payload = buildFcmPayload(digest);

  expect(payload.items_json).toBe("[]");
  expect(payload.payload_overflow).toBe("false");
});

// 케이스 4: 4KB 초과 시 items_json="[]", payload_overflow="true"
test("4KB 초과 페이로드는 items_json=[] 이고 payload_overflow=true이다", () => {
  // items_json이 크기를 초과할 만큼 큰 데이터 생성
  const bigItems = Array.from({ length: 5 }, (_, i) => ({
    source: "언론사".repeat(50),
    title: `기사 제목 ${"가".repeat(200)} ${i}`,
    shortSummary: `요약 ${"나".repeat(200)} ${i}`,
  }));
  const digest = makeDigest({
    headline: "헤드라인 " + "다".repeat(500),
    items: bigItems,
    articleCount: 5,
  });

  const payload = buildFcmPayload(digest);
  expect(payload.items_json).toBe("[]");
  expect(payload.payload_overflow).toBe("true");
});

// 케이스 5: 한글 headline UTF-8 바이트 크기 측정 정확성
test("한글 headline의 UTF-8 바이트 크기를 정확히 측정한다", () => {
  const headline = "가나다라마바사아자차카타파하"; // 14자, 각 3바이트 = 42바이트
  const digest = makeDigest({ headline });
  const payload = buildFcmPayload(digest);

  const measured = measurePayloadBytes(payload);
  const expected = Buffer.byteLength(JSON.stringify(payload), "utf8");
  expect(measured).toBe(expected);

  // 한글 문자 3바이트 확인: "가" 단일 문자 체크
  expect(Buffer.byteLength("가", "utf8")).toBe(3);
});

// 케이스 6: 모든 필드가 string 타입인지 검증
test("페이로드의 모든 필드가 string 타입이다", () => {
  const digest = makeDigest();
  const payload = buildFcmPayload(digest);

  const fields: (keyof FcmPayload)[] = [
    "digest_id",
    "date_kst",
    "headline",
    "items_json",
    "total_count",
    "created_at",
    "payload_overflow",
  ];

  for (const field of fields) {
    expect(typeof payload[field]).toBe("string");
  }
});

// 케이스 7: measurePayloadBytes 정확성
test("measurePayloadBytes는 Buffer.byteLength와 동일한 값을 반환한다", () => {
  const digest = makeDigest({ items: makeItems(5), articleCount: 5 });
  const payload = buildFcmPayload(digest);

  const measured = measurePayloadBytes(payload);
  const direct = Buffer.byteLength(JSON.stringify(payload), "utf8");
  expect(measured).toBe(direct);
});

// 케이스 8: total_count가 articleCount의 string 표현인지 확인
test("total_count는 articleCount의 string 표현이다", () => {
  const digest = makeDigest({ articleCount: 42 });
  const payload = buildFcmPayload(digest);

  expect(payload.total_count).toBe("42");
});
