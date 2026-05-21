# 진행 상태 원장 (Progress Ledger)

> 오케스트레이터가 각 단계 시작/종료 시 갱신한다. 상태: `TODO` / `IN_PROGRESS` / `BLOCKED` / `DONE`.

## 마일스톤

| 단계 | 담당 에이전트 | 상태 | 비고 |
| --- | --- | --- | --- |
| M0. Harness 구성 | (오케스트레이터 직접) | DONE | 본 커밋에서 완료. `.claude/agents/`, `docs/` 골격 생성. |
| M1. 외부 의존성 조사 | researcher | IN_PROGRESS | Q2/Q3/Q4 RESOLVED, Q1 PARTIAL(쿼터·상업 앱 발급 가능 여부 미확인). Q9·Q12 후속 조사 대기. |
| M2. 계획·아키텍처 수립 | planner | IN_PROGRESS | `docs/plan.md`·`docs/architecture.md` 초안 작성 완료. researcher Q1~Q4 결과 미수신으로 T-04/T-05/T-07 분기 미확정. 신규 결정 사항 Q9~Q12 추가. |
| M3. 사용자 승인 | (오케스트레이터 ↔ 사용자) | TODO | M2 결과 검토 및 결정 사항 확정. |
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
