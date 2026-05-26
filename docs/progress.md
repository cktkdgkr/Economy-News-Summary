# 진행 상태 원장 (Progress Ledger)

> 오케스트레이터가 각 단계 시작/종료 시 갱신한다. 상태: `TODO` / `IN_PROGRESS` / `BLOCKED` / `DONE`.

## 마일스톤

| 단계 | 담당 에이전트 | 상태 | 비고 |
| --- | --- | --- | --- |
| M0. Harness 구성 | (오케스트레이터 직접) | DONE | 본 커밋에서 완료. `.claude/agents/`, `docs/` 골격 생성. |
| M1. 외부 의존성 조사 | researcher | DONE | Q2/Q3/Q4/Q9/Q13/Q14 RESOLVED. Q1 DEPRIORITIZED, Q12 OBSOLETE. 외부 의존성 모두 확정 (NewsData.io / Firebase Functions / Anthropic Claude). |
| M2. 계획·아키텍처 수립 | planner | DONE | plan.md/architecture.md 재작성 완료(2026-05-22). 단일 채택안: NewsData.io / Firebase Functions 2nd gen + Cloud Scheduler + FCM / Anthropic Claude `claude-haiku-4-5-20251001`. 작업 단위 T-A01~T-A12(Android), T-B01~T-B09(Backend)로 재구성. Q5/Q6/Q7/Q10/Q11 RESOLVED. |
| M3. 사용자 승인 | (오케스트레이터 ↔ 사용자) | DONE | 2026-05-22 사용자 승인. LLM 공급자는 Gemini 2.5 Flash로 변경 결정. |
| M4. 프로젝트 스캐폴드 | coder → code-reviewer | DONE | Backend T-B01(2026-05-22), Android T-A01(2026-05-26) 모두 code-reviewer PASS. |
| M5. 뉴스 수집 모듈 | coder → code-reviewer | DONE | T-B02 NewsData.io 클라이언트 + KST 윈도 계산. code-reviewer PASS(2026-05-26). |
| M6. 요약기 모듈 | coder → code-reviewer | DONE | T-B03 Gemini 클라이언트 + 100자 후처리 + 토큰 버킷. code-reviewer PASS(2026-05-26). |
| M6.5. 다이제스트 빌드 | coder → code-reviewer | DONE | T-B04 수집→요약→Firestore 통합 파이프라인. code-reviewer PASS(2026-05-26). |
| M6.6. 도메인 모델 | coder → code-reviewer | DONE | T-A02 model/port/usecase. code-reviewer PASS(2026-05-26, 1차 FAIL→수정→재검증). |
| M6.7. FCM 토대 | coder → code-reviewer | DONE | T-A03 Firebase BoM + FCM + 토픽 구독. code-reviewer PASS(2026-05-26). |
| M7. 스케줄러/알림 | coder → code-reviewer | DONE | T-B05 스케줄러 PASS, T-B06 FCM 발송 PASS, T-B07 시크릿 PASS(2026-05-26). |
| M7.5. Room/알림/길이검증 | coder → code-reviewer | DONE | T-A04 Room PASS, T-A05 LengthEnforcer PASS, T-A06 알림채널 PASS(2026-05-26). |
| M8. UI(Compose) | coder → code-reviewer | DONE | T-A07 Home/Detail/NavGraph PASS, T-A08 Settings PASS, T-A09 오프라인 폴백 PASS(2026-05-26). |
| M9. 테스트 | test-engineer | DONE | T-B08 종단 통합 테스트 45건 그린(2026-05-26). 핵심 시나리오 모두 커버. |
| M10. 보안·정책 검토 | security-compliance | TODO | 배포 차단 항목 0건. |
| M11. 빌드·배포 준비 | release-engineer | DONE | T-A11 ProGuard/R8 릴리스 PASS, T-A12 CI/CD GitHub Actions PASS(2026-05-26). |
| M12. 내부 테스트 트랙 업로드 | (사용자) | TODO | Play Console internal testing. |

## 변경 로그

- 2026-05-21: 다중 에이전트 Harness 골격 생성 (M0 DONE).
- 2026-05-21: planner가 `docs/plan.md`(T-01~T-12), `docs/architecture.md` 초안 작성. open-questions Q9~Q12 추가. M2 IN_PROGRESS(분기 미확정).
- 2026-05-21: researcher Q1~Q4 조사 완료. `docs/research/q1~q4-*.md` 4건 추가. Q2/Q3/Q4 RESOLVED, Q1 PARTIAL. 빅카인즈 스크래핑 불가·FCM/백엔드 프록시 권장 결론. M3 사용자 결정 대기(빅카인즈 API 신청 가능 여부 + 백엔드 운영 가능 여부).
- 2026-05-22: 사용자 1차 결정 수신 — (1) 빅카인즈 보류, **네이버 뉴스 대체 가능성 조사 지시** → Q1 DEPRIORITIZED, Q13 신설. (2) 백엔드는 **최소 비용 서버리스 선호** → Q14 신설. (3) **LLM은 Claude(Anthropic) 고정** → Q9 RESOLVED. researcher에 Q13·Q14 병렬 위임.
- 2026-05-22: researcher Q13·Q14 완료. Q14 → **Firebase Cloud Functions 2nd gen + Cloud Scheduler + FCM**(월 $0) 채택. Q13 → 네이버 약관 PARTIAL(LLM 재배포 가능 여부 불명), 사용자 결정 **NewsData.io 채택**(상업용 허용·business+ko+kr·12h 지연 허용). M1 DONE. planner에 plan.md/architecture.md 재작성 위임.
- 2026-05-22: planner가 `docs/plan.md`·`docs/architecture.md` 전면 재작성. 저장소를 `android/` + `backend/` 두 트리로 분리, 작업 단위를 T-A##(Android)/T-B##(Backend)로 재구성. 빅카인즈·온디바이스·WorkManager 옵션 완전 제거. 다이제스트 생성은 백엔드, 앱은 FCM 수신·표시·캐시·알림만 담당으로 확정. Q5/Q6/Q7/Q10/Q11 RESOLVED 처리. M2 DONE. M3(사용자 승인) 대기.
- 2026-05-22: 사용자 결정 — 무료 요구 충족 위해 LLM 공급자를 **Google Gemini 2.5 Flash (AI Studio 무료)**로 변경. Q15 신설·RESOLVED, Q9 결론 갱신. plan.md/architecture.md의 LLM 표기 일괄 교체. M3 DONE.
- 2026-05-22: **T-B01 완료**(code-reviewer PASS). `backend/` 트리 신규: Firebase Functions 2nd gen + TypeScript 스캐폴드, `helloWorld` v2 HTTPS(asia-northeast3), Node 20, ESLint 9 flat config, README/EMULATOR 가이드. 외부 콘솔 작업(프로젝트 생성·Blaze 전환)은 사용자 대기. M4 IN_PROGRESS.
- 2026-05-26: **T-B02 완료**(code-reviewer PASS, 1차 FAIL→수정→재검증 PASS). NewsData.io 클라이언트(fetch 주입, zod DTO, 페이지네이션 3페이지 하드캡) + KST 윈도 계산(UTC+9 전일 윈도). jest 도입, 11 테스트 그린. M5 DONE.
- 2026-05-26: **T-B03 완료**(code-reviewer PASS, 1차 FAIL→수정→재검증 PASS). Gemini 클라이언트(@google/genai, 2.5-flash→2.0-flash 폴백, 지수 백오프 4회 시도) + lengthEnforcer(80~120자, 코드포인트 기준) + rateLimiter(10 RPM 토큰 버킷). 16 테스트 그린. M6 DONE.
- 2026-05-26: **T-A01 완료**(code-reviewer PASS, 1차 FAIL→수정→재검증 PASS). `android/` 트리 신규: Kotlin 2.1 + AGP 8.7.3 + Compose + Hilt + KSP + Version Catalog. 빌드는 SDK 미설치 환경으로 구문 정합성만 확인. M4 DONE.
- 2026-05-26: **T-B04 완료**(code-reviewer PASS). 다이제스트 빌드 함수: 수집→요약→Firestore 저장 파이프라인. 멱등 upsert(merge:true), expiresAt 90일, 기사 0건 빈 다이제스트. 7 테스트 그린(총 34). M6.5 DONE.
- 2026-05-26: **T-A02 완료**(code-reviewer PASS, 1차 FAIL→수정→재검증 PASS). domain 모델(DailyDigest, DigestItem), Port 4종(DigestRepository, NotificationPort, ClockPort, DigestFetchPort), UseCase 2종(ObserveLatestDigest, IngestDigest). kotlinx-serialization-json 도입. 3 테스트. M6.6 DONE.
- 2026-05-26: **T-A03 완료**(code-reviewer PASS). Firebase BoM 33.7.0 + FCM SDK, EconomyFcmService(MessagingService), economy-news 토픽 구독, AndroidManifest 권한·서비스 등록, google-services.json.example. M6.7 DONE.
