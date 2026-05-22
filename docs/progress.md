# 진행 상태 원장 (Progress Ledger)

> 오케스트레이터가 각 단계 시작/종료 시 갱신한다. 상태: `TODO` / `IN_PROGRESS` / `BLOCKED` / `DONE`.

## 마일스톤

| 단계 | 담당 에이전트 | 상태 | 비고 |
| --- | --- | --- | --- |
| M0. Harness 구성 | (오케스트레이터 직접) | DONE | 본 커밋에서 완료. `.claude/agents/`, `docs/` 골격 생성. |
| M1. 외부 의존성 조사 | researcher | DONE | Q2/Q3/Q4/Q9/Q13/Q14 RESOLVED. Q1 DEPRIORITIZED, Q12 OBSOLETE. 외부 의존성 모두 확정 (NewsData.io / Firebase Functions / Anthropic Claude). |
| M2. 계획·아키텍처 수립 | planner | DONE | plan.md/architecture.md 재작성 완료(2026-05-22). 단일 채택안: NewsData.io / Firebase Functions 2nd gen + Cloud Scheduler + FCM / Anthropic Claude `claude-haiku-4-5-20251001`. 작업 단위 T-A01~T-A12(Android), T-B01~T-B09(Backend)로 재구성. Q5/Q6/Q7/Q10/Q11 RESOLVED. |
| M3. 사용자 승인 | (오케스트레이터 ↔ 사용자) | IN_PROGRESS | planner 재작성 결과(`docs/plan.md`, `docs/architecture.md`) 사용자 검토·승인 대기. |
| M4. 프로젝트 스캐폴드 | coder → code-reviewer | TODO | Android 프로젝트 초기 생성, Gradle/Compose 설정. |
| M5. 뉴스 수집 모듈 | coder → code-reviewer | TODO | 빅카인즈 클라이언트 + 시간 윈도 계산. |
| M6. 요약기 모듈 | coder → code-reviewer | TODO | LLM 호출 + 100자 제약. |
| M7. 스케줄러/알림 | coder → code-reviewer | TODO | KST 07:00 트리거 + 알림. |
| M8. UI(Compose) | coder → code-reviewer | TODO | 홈/상세 화면. |
| M9. 테스트 | test-engineer | TODO | 핵심 시나리오 그린. |
| M10. 보안·정책 검토 | security-compliance | TODO | 배포 차단 항목 0건. |
| M11. 빌드·배포 준비 | release-engineer | TODO | 서명·AAB·CI. |
| M12. 내부 테스트 트랙 업로드 | (사용자) | TODO | Play Console internal testing. |

## 변경 로그

- 2026-05-21: 다중 에이전트 Harness 골격 생성 (M0 DONE).
- 2026-05-21: planner가 `docs/plan.md`(T-01~T-12), `docs/architecture.md` 초안 작성. open-questions Q9~Q12 추가. M2 IN_PROGRESS(분기 미확정).
- 2026-05-21: researcher Q1~Q4 조사 완료. `docs/research/q1~q4-*.md` 4건 추가. Q2/Q3/Q4 RESOLVED, Q1 PARTIAL. 빅카인즈 스크래핑 불가·FCM/백엔드 프록시 권장 결론. M3 사용자 결정 대기(빅카인즈 API 신청 가능 여부 + 백엔드 운영 가능 여부).
- 2026-05-22: 사용자 1차 결정 수신 — (1) 빅카인즈 보류, **네이버 뉴스 대체 가능성 조사 지시** → Q1 DEPRIORITIZED, Q13 신설. (2) 백엔드는 **최소 비용 서버리스 선호** → Q14 신설. (3) **LLM은 Claude(Anthropic) 고정** → Q9 RESOLVED. researcher에 Q13·Q14 병렬 위임.
- 2026-05-22: researcher Q13·Q14 완료. Q14 → **Firebase Cloud Functions 2nd gen + Cloud Scheduler + FCM**(월 $0) 채택. Q13 → 네이버 약관 PARTIAL(LLM 재배포 가능 여부 불명), 사용자 결정 **NewsData.io 채택**(상업용 허용·business+ko+kr·12h 지연 허용). M1 DONE. planner에 plan.md/architecture.md 재작성 위임.
- 2026-05-22: planner가 `docs/plan.md`·`docs/architecture.md` 전면 재작성. 저장소를 `android/` + `backend/` 두 트리로 분리, 작업 단위를 T-A##(Android)/T-B##(Backend)로 재구성. 빅카인즈·온디바이스·WorkManager 옵션 완전 제거. 다이제스트 생성은 백엔드, 앱은 FCM 수신·표시·캐시·알림만 담당으로 확정. Q5/Q6/Q7/Q10/Q11 RESOLVED 처리. M2 DONE. M3(사용자 승인) 대기.
