# 미해결 질문 (Open Questions)

> 각 항목은 `researcher` 또는 `planner`가 조사·결정해야 한다. 해소되면 결론 요약과 근거 링크(`docs/research/<slug>.md`)를 같은 항목 옆에 적고 상태를 `RESOLVED`로 표기한다.

| ID | 질문 | 담당 | 상태 | 결론 / 근거 |
| --- | --- | --- | --- | --- |
| Q1 | 빅카인즈가 공식 Open API를 제공하는가? 제공한다면 키 발급·이용약관·쿼터(분당/일간 호출 한도, 본문 노출 범위)는? | researcher | DEPRIORITIZED | 상업용 앱 발급 가능 여부 불확실 → 사용자 지시로 네이버 뉴스 대체 조사(Q13)로 전환. [docs/research/q1-bigkinds-api.md](research/q1-bigkinds-api.md) |
| Q2 | API가 없거나 제약이 클 경우, 빅카인즈의 이용약관과 robots.txt 상 **스크래핑 가능 여부**는? | researcher | RESOLVED | 약관·해커톤 규정 모두 크롤링/전재 금지 → 스크래핑 분기(B) 비채택 → [docs/research/q2-bigkinds-scraping.md](research/q2-bigkinds-scraping.md) |
| Q3 | 오전 7시 정시 알림 구현 방식: (a) 백엔드 cron + FCM 푸시 vs (b) 단말 WorkManager + 로컬 알림 — 정시성·비용·복잡도·정책 측면 비교. | researcher → planner | RESOLVED | Android 14+ exact alarm 불허·Play 정책상 뉴스 앱 불가 → **백엔드 cron + FCM 권장** → [docs/research/q3-scheduling.md](research/q3-scheduling.md) |
| Q4 | 요약 LLM 호출 위치: **백엔드(키 보호 가능)** vs **온디바이스**. 키 노출 위험·지연·비용·오프라인 동작 평가. | researcher → security-compliance | RESOLVED | 앱 키 내장은 역공학 위험·비용 월 $0.10 미만 → **백엔드 프록시 채택** → [docs/research/q4-llm-call-site.md](research/q4-llm-call-site.md) |
| Q5 | 기술 스택 확정: Kotlin + Jetpack Compose 기준(권장). 의존성(Retrofit/OkHttp, Coroutines/Flow, WorkManager, Room 캐시 여부, Hilt/Koin DI) 확정. | planner | OPEN | — |
| Q6 | "100자 내외" 정의(자/문자/그래프? 한글 공백 포함? 허용 오차)와 키워드 위주 스타일 가이드. | planner | OPEN | — |
| Q7 | 사용자에게 알림 이외 화면 진입 시 무엇을 보여줄 것인가(요약 카드, 원문 링크 목록, 카테고리 필터)? | planner | OPEN | — |
| Q8 | 개인정보처리방침/데이터 안전 섹션에 기재할 수집 데이터 범위(현재 가정: 없음)와 게시 URL. | security-compliance | OPEN | — |
| Q9 | LLM 공급자 후보 비교(OpenAI / Anthropic / Google / HyperCLOVA X): 한국어 키워드 요약 품질·비용·약관·지연 평가. | researcher → planner | RESOLVED | 사용자 결정: **Anthropic Claude로 고정** (claude-haiku-4-5 기본, 백엔드 프록시 경유). 비교 조사 생략. |
| Q10 | 알림 본문 표시 정책: 헤드라인 외 "원문 N건" 표시 여부, 알림 그룹/요약 채널 사용 여부. | planner | OPEN | T-07 진입 전 확정. |
| Q11 | 다이제스트 캐시 보관 기간(예: 30일) 및 자동 삭제 정책. | planner | OPEN | T-06 또는 T-10에서 확정. |
| Q12 | 빅카인즈 응답 본문이 짧을 경우 외부 원문 크롤링 허용 여부(권장 기본값: 불허, 원문 링크만 노출). | researcher → security-compliance | OBSOLETE | 빅카인즈 비채택으로 무효화. Q13에서 네이버 뉴스 기준으로 재정의. |
| Q13 | **네이버 뉴스를 빅카인즈 대체 소스로 사용 가능한가?** 네이버 검색 Open API(news 카테고리) 약관·쿼터·상업용 앱 허용·본문 노출 범위(요약 vs 링크) + 경제 카테고리 필터 가능 여부. | researcher | PARTIAL | API 즉시 발급·쿼터(25,000/일)·파라미터 확인 완료. **상업용 약관 결과 데이터 가공·배포 금지 조항 존재 가능성** → 개발자센터 원문 확인 또는 네이버 문의 후 최종 결정 필요. 차선책 1순위: NewsData.io 무료(상업용 명시 허용, business+ko 파라미터). → [docs/research/q13-naver-news.md](research/q13-naver-news.md) |
| Q14 | **최소 비용 서버리스 백엔드 선택**: Cloudflare Workers(+KV/D1) / Firebase Functions(+FCM) / Vercel / Supabase Edge Functions 비교. 무료 한도, FCM 발송 가능 여부, cron 스케줄, Anthropic API 호출 지연, Android 클라이언트 SDK 궁합. | researcher | RESOLVED | **Firebase Cloud Functions 2nd gen + Cloud Scheduler + FCM 1순위**: 월 $0, Admin SDK FCM 네이티브, Asia/Seoul 타임존 직접 지원. Cloudflare Workers 유료($5/월) 2순위. Vercel Hobby 상업용 금지, Supabase 무료 자동일시정지 리스크. → [docs/research/q14-serverless-backend.md](research/q14-serverless-backend.md) |

## 갱신 규칙
- 새 질문이 발생하면 표 하단에 ID를 이어붙여 추가한다.
- 해소 시 `상태`를 `RESOLVED`로 바꾸고 `결론 / 근거` 칸에 한 줄 요약 + `docs/research/<slug>.md` 링크를 넣는다.
