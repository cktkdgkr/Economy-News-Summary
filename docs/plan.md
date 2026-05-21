# 구현 계획 (Plan)

> 본 계획은 `docs/project-spec.md`와 `docs/architecture.md`를 기준으로 작성됐다. researcher Q1~Q4 결과 수신 시 일부 작업 단위(특히 T-04, T-05, T-07)는 **분기 확정** 단계가 필요하다. 본 문서의 "조건부" 항목을 참조하라.
>
> 단위 단위 PR/커밋로 머지하는 것을 전제로 한다. 각 작업 단위는 `code-reviewer` PASS를 게이트로 한다.

---

## 0. 작업 단위 표 (Topological order)

| ID | 제목 | 의존 | 완료 기준(요약) | 위험 |
| --- | --- | --- | --- | --- |
| T-01 | Gradle/Android 프로젝트 스캐폴드 | — | `./gradlew assembleDebug` 통과, Hilt App 실행, Compose 빈 화면 표시 | Gradle/AGP/Compose 호환성 |
| T-02 | KST 시간 윈도 유틸 | T-01 | `yesterdayKstWindow()` 단위테스트 그린, 경계값 포함 | 시간대 오해 |
| T-03 | 도메인 모델 + Port 인터페이스 | T-01 | `domain` 패키지에 모델·UseCase·Port 컴파일·테스트 그린 | 모델 누락 |
| T-04 | 빅카인즈 클라이언트 + 캐시 | T-02, T-03 | MockWebServer로 윈도 내 기사 조회 그린, Room 캐시 동작 | **Q1/Q2 분기 대기** |
| T-05 | 요약기(LLM) + 100자 후처리 | T-03 | 임시 LLM mock으로 요약 → `LengthEnforcer`가 100±20자 보장 | **Q4 분기 대기** |
| T-06 | 일일 다이제스트 빌드 파이프라인 | T-04, T-05 | `BuildDailyDigestUseCase` 통합 테스트(가짜 데이터) 그린, DB에 1건 저장 | 부분 실패 처리 |
| T-07 | 스케줄러 + 알림 채널 + 시스템 알림 | T-06 | 강제 트리거 시 알림 게시, 실기기 1회 검증 체크리스트 | **Q3 분기 대기**, OEM Doze |
| T-08 | UI: Home / Detail 화면 | T-06 | 캐시 기반으로 오늘의 요약 + 원문 링크 목록 표시, 네비게이션 동작 | UX 디테일 |
| T-09 | 설정 화면 (권한 안내, 알림 시각 고정 표시, LLM 키 입력 또는 안내) | T-07, T-08 | 권한 토글 UI, (Q4 결과에 따른) 키 입력/안내 화면 동작 | Q4 결과 의존 |
| T-10 | 오류·오프라인 폴백 | T-06, T-08 | 네트워크 실패 모킹 시 직전 캐시 표시, 사용자 가시 오류 메시지 | 상태 머신 누락 |
| T-11 | ProGuard/R8 + 릴리스 빌드 | T-01~T-10 | `bundleRelease` 산출, R8 후 런타임 크래시 없음(스모크) | 리플렉션 회피 규칙 |
| T-12 | CI(GitHub Actions): PR=lint+test, tag=AAB | T-11 | PR 빌드 그린, 태그 푸시 시 AAB 아티팩트 업로드 | 시크릿 구성 |

---

## T-01 Gradle/Android 프로젝트 스캐폴드

- **목적**: 빌드·DI·Compose 토대 마련.
- **변경 대상(예상)**:
  - `settings.gradle.kts`, `build.gradle.kts`(root/app), `gradle/libs.versions.toml`
  - `app/src/main/AndroidManifest.xml`, `app/src/main/java/.../EconomyNewsApp.kt`, `MainActivity.kt`
  - `.gitignore`, `gradle/wrapper/*`
- **의존**: 없음.
- **완료 기준**:
  - [ ] Kotlin 2.x + AGP 최신 안정 + Compose Compiler(KGP 통합) 적용.
  - [ ] `minSdk=26`, `targetSdk=최신(34 이상)`, `applicationId` 결정.
  - [ ] Version Catalog(`libs.versions.toml`) 적용.
  - [ ] Hilt 적용 + `@HiltAndroidApp` 클래스 등록.
  - [ ] Compose Material 3 + Theme 골격.
  - [ ] `./gradlew :app:assembleDebug` 성공.
  - [ ] Compose 빈 화면("Economy News Summary") 표시.
- **위험·완화**:
  - AGP/Compose Compiler 호환성 → 사용 시점 안정 버전 매트릭스 확인.
  - Hilt + KSP 전환 이슈 → 공식 가이드 준수.

---

## T-02 KST 시간 윈도 유틸

- **목적**: "전일 KST 00:00 ~ 24:00" 윈도를 결정적·테스트 가능하게 산출.
- **변경 대상**:
  - `core/time/KstWindow.kt` — `fun yesterdayKstWindow(now: Instant, zone: ZoneId = SEOUL): InstantRange`
  - `core/time/Clock.kt` — `interface ClockPort { fun now(): Instant }` + 기본 구현.
  - 테스트: `KstWindowTest.kt`(자정 직전/직후, 임의 시각, 명시적 KST 입력).
- **의존**: T-01.
- **완료 기준**:
  - [ ] `start = yesterday@00:00 KST`, `end = today@00:00 KST` (반열린 \[start,end)).
  - [ ] DST 없음 가정 하 24h 정확.
  - [ ] Fake Clock 주입 가능.
  - [ ] 단위 테스트 ≥ 5 케이스 그린.
- **위험·완화**: 시간대 혼선 → 모든 함수 시그니처에서 `Instant`만 노출, KST는 함수 내부 한정.

---

## T-03 도메인 모델 + Port 인터페이스

- **목적**: 외부 의존성을 가진 작업 전에 도메인 경계 고정.
- **변경 대상**:
  - `domain/model/Article.kt`, `ArticleSummary.kt`, `DailyDigest.kt`, `Region.kt`.
  - `domain/port/NewsRepository.kt`, `SummarizerPort.kt`, `DigestRepository.kt`, `NotificationPort.kt`, `ClockPort.kt`.
  - `domain/usecase/BuildDailyDigestUseCase.kt`, `ObserveLatestDigestUseCase.kt`.
- **의존**: T-01.
- **완료 기준**:
  - [ ] 모델은 `data class`, 안드로이드 의존성 0.
  - [ ] Port 인터페이스는 도메인 모델만 노출.
  - [ ] UseCase는 Coroutines 기반(`suspend` / `Flow`).
  - [ ] 컴파일·정적 분석 그린.
- **위험**: 모델 누락 → T-06 통합 단계에서 수정 비용. 완화: 사양 §3,§5,§6 체크.

---

## T-04 빅카인즈 클라이언트 + 캐시

- **목적**: 윈도 내 경제 카테고리(글로벌 + KR) 기사 메타데이터/본문(가능한 범위) 획득.
- **변경 대상(분기에 따라 둘 중 하나)**:
  - **분기 A — 공식 API 사용 가능(Q1 OK)**
    - `data/remote/bigkinds/BigKindsApi.kt` (Retrofit)
    - `data/remote/bigkinds/dto/*.kt` (kotlinx.serialization)
    - 인증·쿼터 인터셉터.
  - **분기 B — 스크래핑(Q2 허용)**
    - `data/remote/bigkinds/BigKindsScraper.kt` (OkHttp + Jsoup)
    - robots.txt 준수 검사 유틸, 백오프.
  - **공통**: `data/repository/NewsRepositoryImpl.kt`, `data/local/ArticleDao.kt`, `Article` Entity, 매퍼.
- **의존**: T-02, T-03.
- **완료 기준**:
  - [ ] MockWebServer 기반 응답으로 윈도 \[start,end) 기사 N건 조회 통합 테스트 그린.
  - [ ] Room 캐시 upsert + 같은 윈도 재호출 시 네트워크 미발생(또는 ETag/조건부 갱신).
  - [ ] 카테고리·지역(GLOBAL/KR) 필터링 동작.
  - [ ] 비정상 응답(429/5xx) 시 지수 백오프 단위 테스트.
- **조건부**:
  - Q1 응답이 (a) **API 제공·이용약관 허용**이면 분기 A로 확정.
  - (b) **API 없음·스크래핑 약관/Robots 허용**이면 분기 B.
  - (c) **둘 다 불가**면 사양 변경 에스컬레이션 → 사용자 결정.
- **위험·완화**: 약관 위반 위험 → security-compliance 사전 검토. 본문 노출 범위가 짧으면 요약 품질 저하 → T-05 입력 정책 조정(제목+리드+본문 일부).

---

## T-05 요약기 + 100자 후처리

- **목적**: 기사 집합을 단일 키워드 요약(헤드라인)으로 압축. 항목별 개별 요약도 생성.
- **변경 대상**:
  - `data/remote/summarizer/LlmClient.kt` (Retrofit, 인증 헤더는 분기에 따라 차이).
  - `data/repository/SummarizerRepositoryImpl.kt`.
  - `domain/text/SummaryLengthEnforcer.kt` — 100±20자 강제(코드포인트 기반, 줄바꿈 제거, 키워드 위주 후처리).
  - 프롬프트 템플릿 `data/remote/summarizer/Prompts.kt`(한국어, 키워드 위주, 100자 제약).
- **의존**: T-03.
- **완료 기준**:
  - [ ] `SummaryLengthEnforcer` 단위 테스트(짧음/길음/특수문자/이모지/한자) ≥ 8 케이스 그린.
  - [ ] MockWebServer로 LLM 응답 모킹 후 헤드라인 + 항목별 요약 생성 통합 테스트 그린.
  - [ ] 실패 시(429, 타임아웃) 재시도 + 부분 성공 처리.
- **조건부**:
  - Q4 (a) **백엔드 프록시**: `LlmClient`의 baseUrl은 자체 백엔드, 인증은 익명 또는 단말 토큰. 키는 클라이언트 없음.
  - Q4 (b) **온디바이스 직접 호출**: BuildConfig/EncryptedSharedPreferences/사용자 입력 키 중 하나 선택. security-compliance 추가 검토 필수.
- **위험**: 100자 정의 모호 → Q6 잠정안(공백 포함 코드포인트 80~120자)으로 진행, 변경 시 단일 함수만 수정.

---

## T-06 일일 다이제스트 빌드 파이프라인

- **목적**: 수집→요약→영속화의 엔드투엔드를 한 트랜잭션 흐름으로 묶음.
- **변경 대상**:
  - `domain/usecase/BuildDailyDigestUseCase.kt` 본격 구현.
  - `data/local/DigestDao.kt`, `DailyDigest` Entity + 매퍼.
  - `data/repository/DigestRepositoryImpl.kt`.
- **의존**: T-04, T-05.
- **완료 기준**:
  - [ ] Fake `NewsRepository` + Fake `SummarizerPort`로 통합 테스트: 기사 K건 → 다이제스트 1건 저장.
  - [ ] 일자 중복 저장 시 `REPLACE` 정책, 시간 윈도 일관성 검증.
  - [ ] 부분 실패(기사 일부 요약 실패) 허용 + 로깅.
- **위험**: 트랜잭션 누락 → Room `@Transaction` 사용 + 통합 테스트.

---

## T-07 스케줄러 + 알림 채널 + 시스템 알림

- **목적**: KST 07:00 ± 5분에 다이제스트 게시.
- **변경 대상(분기)**:
  - **분기 B (WorkManager + 로컬, 기본 가정)**:
    - `work/DailyDigestWorker.kt` (@HiltWorker, Coroutine Worker).
    - `work/DigestScheduler.kt` — 다음 07:00까지 `initialDelay` 계산, `PeriodicWorkRequest` + 일일 재예약 보조.
    - `BootCompletedReceiver`(재예약).
  - **분기 A (FCM)**:
    - `services/EconomyFcmService.kt` (data message 수신 → Worker enqueue).
    - 백엔드는 본 저장소 범위 밖(별도 백오피스 필요) — 사양 변경 에스컬레이션.
  - **공통**:
    - `platform/notification/NotificationChannels.kt` ("daily_digest" 채널, IMPORTANCE_HIGH).
    - `platform/notification/DailyDigestNotifier.kt` (NotificationCompat.Builder).
- **의존**: T-06.
- **완료 기준**:
  - [ ] 강제 트리거(adb로 Worker 즉시 실행)로 알림 게시 확인.
  - [ ] 알림 본문 = 헤드라인(100±20자), 탭 시 Home Detail로 딥링크.
  - [ ] 권한 미허용 시 UI 안내, 알림 미게시.
  - [ ] OEM Doze 환경(실기기 또는 에뮬레이터 Battery Saver) 1회 수동 검증 체크리스트 통과.
- **조건부**: Q3 결과로 분기 확정.
- **위험**: OEM별 정시성 편차 → 사용자에게 "배터리 최적화 예외 권장" 안내 화면 추가(설치 후 1회).

---

## T-08 UI: Home / Detail

- **목적**: 알림 탭/앱 진입 시 오늘의 요약을 본다.
- **변경 대상**:
  - `presentation/home/HomeScreen.kt`, `HomeViewModel.kt`.
  - `presentation/detail/DigestDetailScreen.kt`, `DetailViewModel.kt`.
  - `presentation/navigation/NavGraph.kt` + 알림 딥링크.
  - 원문 링크는 `androidx.browser`(Custom Tabs).
- **의존**: T-06.
- **완료 기준**:
  - [ ] Home: 오늘의 헤드라인 + 다이제스트 생성 시각(KST).
  - [ ] Detail: 헤드라인 + 항목별 요약 카드 리스트(언론사·시각·요약·원문 링크).
  - [ ] 빈/로딩/에러 상태 분기 표시.
  - [ ] Compose UI 테스트(`createAndroidComposeRule`) 2건 이상 그린.
- **위험**: 디자인 합의 부재 → 초기 버전은 Material 3 기본 컴포넌트로 단순 카드 레이아웃.

---

## T-09 설정 화면

- **목적**: 권한·알림·LLM 키(필요 시) 관리.
- **변경 대상**:
  - `presentation/settings/SettingsScreen.kt`, `SettingsViewModel.kt`.
  - `data/local/SettingsDataStore.kt`.
- **의존**: T-07, T-08.
- **완료 기준**:
  - [ ] 알림 시각은 **고정 07:00 KST** 표시(편집 불가, 사양 §6).
  - [ ] Android 13+에서 `POST_NOTIFICATIONS` 권한 요청 UI.
  - [ ] Q4 결과에 따른 키 관리 UI:
    - (a) 백엔드 프록시: 키 입력 UI 없음, "서버 관리 안내" 문구.
    - (b) 온디바이스: 사용자 키 입력 + EncryptedSharedPreferences 저장 + 마스킹 표시.
  - [ ] 설정 변경 시 즉시 반영(Flow 구독).
- **위험**: 키 평문 저장 위험 → 반드시 EncryptedSharedPreferences 또는 Tink 사용.

---

## T-10 오류·오프라인 폴백

- **목적**: 네트워크 실패·LLM 실패·빅카인즈 차단 시에도 사용성 유지.
- **변경 대상**:
  - `data/repository/*` — `Result<T>` 또는 `sealed UiState` 도입.
  - `presentation/common/UiState.kt`.
- **의존**: T-06, T-08.
- **완료 기준**:
  - [ ] 네트워크 차단 모킹 시 직전 `DailyDigest` 표시 + "오프라인" 표지.
  - [ ] LLM 실패 시 사용자에게 명시(원문 링크는 여전히 노출).
  - [ ] 통합 테스트(Faker) 그린.
- **위험**: 부분 실패 정책 모호 → 정책표를 `architecture.md` §3에 추가하고 본 작업 단위 시작 전 확정.

---

## T-11 ProGuard/R8 + 릴리스 빌드

- **목적**: AAB 산출.
- **변경 대상**:
  - `app/proguard-rules.pro` (Retrofit/Serialization/Hilt/Room 규칙).
  - `app/build.gradle.kts` — `release { isMinifyEnabled=true; isShrinkResources=true }`.
  - 서명: Play App Signing 전제, 업로드 키 구성.
- **의존**: T-01~T-10.
- **완료 기준**:
  - [ ] `./gradlew :app:bundleRelease` 성공.
  - [ ] R8 후 런타임 스모크 테스트(앱 실행 + 강제 Worker 트리거) 통과.
- **위험**: 리플렉션 기반 직렬화 → `@Keep`/`@Serializable` 규칙 명시.

---

## T-12 CI(GitHub Actions)

- **목적**: 회귀 방지 + 릴리스 자동화.
- **변경 대상**:
  - `.github/workflows/ci.yml` — PR: `assembleDebug`, `lint`, `test`.
  - `.github/workflows/release.yml` — `v*` 태그: `bundleRelease` 후 아티팩트 업로드, 서명 시크릿 주입.
- **의존**: T-11.
- **완료 기준**:
  - [ ] PR 워크플로 그린.
  - [ ] 태그 푸시 시 AAB 아티팩트 생성.
- **위험**: 서명 시크릿 노출 → GitHub Secrets + base64 키스토어 + 환경변수 격리.

---

## A. 조건부·분기 요약(researcher 대기)

| 작업 | 분기 트리거 | 결정 후 액션 |
| --- | --- | --- |
| T-04 | Q1, Q2 | 분기 A(API) vs B(스크래핑) 중 택1, 구현 클래스 확정 |
| T-05/T-09 | Q4 | 키 보관 방식·LLM 호출 위치 확정 |
| T-07 | Q3 | WorkManager 단독 vs FCM 추가 결정 |
| 전체 | Q6 | 100자 정의 확정 시 `SummaryLengthEnforcer` 갱신 |

---

## B. 추가로 도출된 결정사항(→ `docs/open-questions.md` Q9~ 누적)

- Q9: LLM 공급자 후보(OpenAI/Anthropic/Google/HyperCLOVA X) 비용·한국어 품질·약관 비교.
- Q10: 알림 본문에 헤드라인 외 "원문 N건" 표시 여부, 알림 그룹화 정책.
- Q11: 다이제스트 보관 기간(예: 30일) 및 삭제 정책.
- Q12: 빅카인즈 응답에 본문이 짧을 경우 외부 원문 크롤링 허용 여부(권장: 불허, 원문 링크만 노출).
