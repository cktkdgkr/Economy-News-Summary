interface LengthOptions {
  min?: number;
  max?: number;
}

/**
 * 텍스트를 코드포인트 기준으로 min~max 범위에 맞게 조정한다.
 * - 줄바꿈 제거
 * - max 초과: 어절 경계(마지막 공백) 우선 잘라내기 + "…" 접미
 * - min 미만: 원문 그대로 반환 + console.warn
 */
export function enforceSummaryLength(
  text: string,
  opts?: LengthOptions,
): string {
  const min = opts?.min ?? 80;
  const max = opts?.max ?? 120;

  // 줄바꿈 제거
  const cleaned = text.replace(/[\n\r]/g, " ").trim();

  const codePoints = Array.from(cleaned);
  const len = codePoints.length;

  if (len > max) {
    // "…" 1 코드포인트를 포함해야 하므로 max-1 위치까지 자름
    const limit = max - 1;
    const slice = codePoints.slice(0, limit).join("");

    // 어절 경계: 마지막 공백 위치 탐색
    const lastSpace = slice.lastIndexOf(" ");
    if (lastSpace > 0) {
      return slice.slice(0, lastSpace) + "…";
    }
    // 어절 경계 없으면 강제 잘라내기
    return slice + "…";
  }

  if (len < min) {
    console.warn(
      `[enforceSummaryLength] 텍스트 길이(${len})가 최솟값(${min})보다 짧습니다.`,
    );
    return cleaned;
  }

  return cleaned;
}
