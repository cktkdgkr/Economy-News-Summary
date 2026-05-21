# 미해결 질문 (Open Questions)

> 각 항목은 `researcher` 또는 `planner`가 조사·결정해야 한다. 해소되면 결론 요약과 근거 링크(`docs/research/<slug>.md`)를 같은 항목 옆에 적고 상태를 `RESOLVED`로 표기한다.

| ID | 질문 | 담당 | 상태 | 결론 / 근거 |
| --- | --- | --- | --- | --- |
| Q1 | 빅카인즈가 공식 Open API를 제공하는가? 제공한다면 키 발급·이용약관·쿼터(분당/일간 호출 한도, 본문 노출 범위)는? | researcher | OPEN | — |
| Q2 | API가 없거나 제약이 클 경우, 빅카인즈의 이용약관과 robots.txt 상 **스크래핑 가능 여부**는? | researcher | OPEN | — |
| Q3 | 오전 7시 정시 알림 구현 방식: (a) 백엔드 cron + FCM 푸시 vs (b) 단말 WorkManager + 로컬 알림 — 정시성·비용·복잡도·정책 측면 비교. | researcher → planner | OPEN | — |
| Q4 | 요약 LLM 호출 위치: **백엔드(키 보호 가능)** vs **온디바이스**. 키 노출 위험·지연·비용·오프라인 동작 평가. | researcher → security-compliance | OPEN | — |
| Q5 | 기술 스택 확정: Kotlin + Jetpack Compose 기준(권장). 의존성(Retrofit/OkHttp, Coroutines/Flow, WorkManager, Room 캐시 여부, Hilt/Koin DI) 확정. | planner | OPEN | — |
| Q6 | "100자 내외" 정의(자/문자/그래프? 한글 공백 포함? 허용 오차)와 키워드 위주 스타일 가이드. | planner | OPEN | — |
| Q7 | 사용자에게 알림 이외 화면 진입 시 무엇을 보여줄 것인가(요약 카드, 원문 링크 목록, 카테고리 필터)? | planner | OPEN | — |
| Q8 | 개인정보처리방침/데이터 안전 섹션에 기재할 수집 데이터 범위(현재 가정: 없음)와 게시 URL. | security-compliance | OPEN | — |

## 갱신 규칙
- 새 질문이 발생하면 표 하단에 ID를 이어붙여 추가한다.
- 해소 시 `상태`를 `RESOLVED`로 바꾸고 `결론 / 근거` 칸에 한 줄 요약 + `docs/research/<slug>.md` 링크를 넣는다.
