import { enforceSummaryLength } from "../src/summarize/lengthEnforcer";

describe("enforceSummaryLength", () => {
  // 케이스 1: 정상 범위 (80~120자) → 그대로 반환
  it("80~120자 범위 텍스트는 그대로 반환한다", () => {
    const text = "가나다라마바사아자차카타파하".repeat(6); // 84자
    const result = enforceSummaryLength(text);
    expect(result).toBe(text);
    expect(Array.from(result).length).toBeGreaterThanOrEqual(80);
    expect(Array.from(result).length).toBeLessThanOrEqual(120);
  });

  // 케이스 2: 120자 초과 → 어절 경계 잘라내기 + "…"
  it("120자 초과 텍스트는 어절 경계에서 잘라내고 … 을 붙인다", () => {
    // 공백으로 구분된 어절이 있는 140자 텍스트
    const text = "글로벌 경제 위기 미국 금리 인상 결정 " + "가나다라마바사아자차카타파하".repeat(7) + " 추가내용";
    const result = enforceSummaryLength(text);
    expect(result.endsWith("…")).toBe(true);
    expect(Array.from(result).length).toBeLessThanOrEqual(120);
  });

  // 케이스 3: 80자 미만 → 원문 그대로 반환 + warn
  it("80자 미만 텍스트는 원문 그대로 반환하고 warn을 출력한다", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const text = "짧은 텍스트";
    const result = enforceSummaryLength(text);
    expect(result).toBe(text);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("최솟값"),
    );
    warnSpy.mockRestore();
  });

  // 케이스 4: 줄바꿈 포함 → 제거 후 검증
  it("줄바꿈 문자를 제거한다", () => {
    const text = "경제\n뉴스\r요약";
    const result = enforceSummaryLength(text, { min: 0 });
    expect(result).not.toContain("\n");
    expect(result).not.toContain("\r");
  });

  // 케이스 5: 이모지 포함 → 코드포인트 기준으로 정확히 계산
  it("이모지를 코드포인트 기준으로 계산한다", () => {
    // 이모지는 서로게이트 페어(2 UTF-16 코드 유닛)이지만 코드포인트 1개
    // 130코드포인트 텍스트: 이모지 10개(각 1코드포인트) + 한글 120자
    const emoji = "🎉";
    const korean = "가나다라마바사아자차카타파하가나다라마바사아자차카타파하가나다라마바사아자차카타파하가나다라마바사아자차카타파하가나다라마바사아자차카타파하가나다라마바사아자차카타파하가나다라마바사아자차카타파하가나다라마바사아자차카타파하가나다라";
    const text = emoji.repeat(5) + korean; // 5 + 130 = 135 코드포인트
    const result = enforceSummaryLength(text);
    const cpLen = Array.from(result).length;
    expect(cpLen).toBeLessThanOrEqual(120);
    expect(result.endsWith("…")).toBe(true);
  });

  // 케이스 6: 한자 혼용
  it("한자가 포함된 텍스트를 코드포인트 기준으로 처리한다", () => {
    // 정상 범위인 한자 혼용 텍스트 (80~120자) — 82코드포인트
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const text = "美中 貿易戰 激化로 글로벌 공급망 재편 가속 " + "한국경제영향분석보고서입니다가나다라마바사아자차카타파하가나다라마바사아자차카타파하가나다라마바사아자차카타파하가";
    const len = Array.from(text).length;
    expect(len).toBeGreaterThanOrEqual(80);
    expect(len).toBeLessThanOrEqual(120);
    const result = enforceSummaryLength(text);
    expect(result).toBe(text.trim());
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  // 케이스 7: 공백만 있는 문자열
  it("공백만 있는 문자열은 trim 후 반환하고 warn을 출력한다", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const text = "   ";
    const result = enforceSummaryLength(text);
    // trim 후 빈 문자열 → min(80) 미만 → warn
    expect(warnSpy).toHaveBeenCalled();
    expect(result).toBe("");
    warnSpy.mockRestore();
  });

  // 케이스 8: 빈 문자열
  it("빈 문자열은 그대로 반환하고 warn을 출력한다", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const result = enforceSummaryLength("");
    expect(result).toBe("");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("최솟값"),
    );
    warnSpy.mockRestore();
  });

  // 케이스 9: 어절 경계가 없는 경우 강제 잘라내기
  it("어절 경계 없이 초과 시 강제 잘라내기 + … 을 붙인다", () => {
    // 공백 없이 150자 연속
    const text = "가나다라마바사아자차카타파하".repeat(11); // 154자
    const result = enforceSummaryLength(text);
    expect(result.endsWith("…")).toBe(true);
    expect(Array.from(result).length).toBeLessThanOrEqual(120);
  });

  // 케이스 10: 문장부호 혼용
  it("문장부호가 혼용된 텍스트를 올바르게 처리한다", () => {
    const text = "美 연준, 기준금리 0.25%p 인하 결정—경기침체 우려 반영! 유럽중앙은행도 동조 가능성↑ 한국·일본 등 아시아 시장 즉각 반응";
    const len = Array.from(text).length;
    const result = enforceSummaryLength(text);
    if (len > 120) {
      expect(Array.from(result).length).toBeLessThanOrEqual(120);
      expect(result.endsWith("…")).toBe(true);
    } else if (len < 80) {
      expect(result).toBe(text.trim());
    } else {
      expect(result).toBe(text.trim());
    }
  });
});
