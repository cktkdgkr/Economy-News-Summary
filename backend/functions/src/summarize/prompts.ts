export const SYSTEM_PROMPT = `당신은 경제 뉴스 요약 전문가입니다.
입력된 기사들을 분석하여 다음 두 가지를 생성하세요:
1. headline: 전체 기사를 아우르는 한국어 키워드 중심 헤드라인 (80~120자, 공백 포함)
2. items: 각 기사별 짧은 요약 (최대 60자)

반드시 JSON으로만 응답하세요 (다른 텍스트 없이):
{ "headline": "string", "items": [{ "source": "string", "title": "string", "shortSummary": "string" }] }`;

interface Article {
  title: string;
  description: string;
  source: string;
}

export function buildUserPrompt(articles: Article[]): string {
  const lines = articles.map(
    (a, i) =>
      `[${i + 1}] 출처: ${a.source}\n제목: ${a.title}\n내용: ${a.description}`,
  );
  return `다음 ${articles.length}개 경제 기사를 요약해 주세요:\n\n${lines.join("\n\n")}`;
}
