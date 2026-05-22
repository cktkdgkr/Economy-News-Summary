# 구현 계획 (Plan)

> 본 계획은 외부 의존성 확정(2026-05-22) 결과를 반영한 단일 채택안 기반 구현 계획이다. NewsData.io(뉴스 소스) + Firebase Cloud Functions 2nd gen + Cloud Scheduler + FCM(백엔드) + Google Gemini 2.5 Flash(요약 LLM, AI Studio 무료 티어, SDK `@google/genai`)를 사용한다. 다이제스트 생성은 백엔드에서 수행하고, Android 앱은 FCM 수신·표시·캐시·알림만 담당한다.
>
> 저장소는 두 트리로 구성한다.
>
> - `android/` — Kotlin + Jetpack Compose 안드로이드 앱.
> - `backend/` — Firebase Functions(Node.js + TypeScript) 코드.
>
> 작업 단위 ID는 안드로이드 `T-A##`, 백엔드 `T-B##`로 구분한다. 각 작업 단위는 단일 PR/커밋로 머지되며 `code-reviewer` PASS 게이트를 통과해야 다음 단위로 진행한다.

---

## 0. 작업 단위 표 (Topological order)

### Backend (`backend/`)

| ID | 제목 | 의존 | 완료 기준(요약) | 위험 |
| --- | --- | --- | --- | --- |
| T-B01 | Firebase 프로젝트 + Functions 스캐폴드(Node.js + TS) | — | `firebase deploy --only functions`(에뮬레이터) 통과, `helloWorld` 함수 호출 성공 | Blaze 플랜 전환 누락, 권한 |
| T-B02 | NewsData.io 클라이언트 + KST 윈도 계산 | T-B01 | 모킹 응답으로 `kst-12h` 윈도 내 기사 N건 조회 단위테스트 그린, 쿼터 한도(200req/일) 가드 | 응답 스키마 변경 |
| T-B03 | Google Gemini 클라이언트 + 100자 후처리 + 프롬프트 | T-B01 | 모킹 응답으로 헤드라인 + 항목별 요약 생성, `enforceSummaryLength` 80~120자 보장 단위테스트 그린, 10 RPM 토큰 버킷 단위테스트 그린 | 모델 응답 길이 변동, 무료 한도 초과 |
| T-B04 | 다이제스트 빌드 함수(수집→요약→Firestore 저장) | T-B02, T-B03 | 통합 테스트(에뮬레이터): NewsData mock + Gemini mock → Firestore에 다이제스트 1건 영속, 부분 실패 허용 | 트랜잭션 누락 |
| T-B05 | Cloud Scheduler KST 07:00 트리거 | T-B04 | `0 7 * * *` Asia/Seoul로 다이제스트 빌드 함수 호출, 수동 트리거로 종단 통과 확인 | 권한·서비스 계정 |
| T-B06 | FCM 발송(topic `economy-news`) + 페이로드 빌더 | T-B04 | data message 발송 코드 단위테스트, 4KB 한도 체크, 초과 시 폴백 플래그 세팅 | 페이로드 4KB 초과 |
| T-B07 | 시크릿 관리(Secret Manager: NewsData/Gemini 키, 서비스 계정) | T-B01 | `defineSecret()`으로 함수 내 접근, 로컬 에뮬레이터 dotenv 분리, 키가 로그에 출력되지 않음 | 키 누출 |
| T-B08 | Functions 단위/통합 테스트 + 에뮬레이터 실행 가이드 | T-B02~T-B06 | `npm test`로 핵심 유닛 그린, 에뮬레이터 시나리오(`README` 또는 `EMULATOR.md`) 작성 | 실환경과 차이 |
| T-B09 | (선택) 다이제스트 fetch HTTPS 엔드포인트(폴백 B) | T-B04 | App Check 또는 토큰 인증으로 보호된 `getLatestDigest` 호출 성공 | 인증 누락 |

### Android (`android/`)

| ID | 제목 | 의존 | 완료 기준(요약) | 위험 |
| --- | --- | --- | --- | --- |
| T-A01 | Gradle/Compose/Hilt 스캐폴드 | — | `./gradlew :app:assembleDebug` 통과, Compose 빈 화면 표시, Hilt App 실행 | Compose/AGP 호환성 |
| T-A02 | 도메인 모델 + Port 인터페이스 | T-A01 | `domain` 모델·UseCase·Port 컴파일·단위테스트 그린, Android 의존성 0 | 모델 누락 |
| T-A03 | Firebase BoM + FCM SDK + Messaging Service + 토픽 구독 | T-A01 | 앱 부팅 시 `economy-news` 토픽 구독, `EconomyFcmService.onMessageReceived` 호출 로그 확인 | google-services.json 누락 |
| T-A04 | 다이제스트 페이로드 파싱 + Room 캐시 + 30일 정리 | T-A02, T-A03 | FCM data 페이로드 → `DailyDigest` 매핑·Room 저장 단위테스트, 31일 이상 자동 삭제 단위테스트 그린 | 페이로드 스키마 |
| T-A05 | `SummaryLengthEnforcer`(클라이언트 2차 검증) | T-A02 | 표시 전 80~120자 보장, 코드포인트·줄바꿈·이모지·한자 케이스 ≥ 8건 그린 | 100자 정의 변경 |
| T-A06 | 알림 채널(`daily_digest`) + 시스템 알림 + 딥링크 | T-A04, T-A05 | 강제 트리거 시 알림 게시, 본문=헤드라인(80~120자), 부제목="원문 N건", 탭→Detail 딥링크 | 권한 미허용 |
| T-A07 | Home/Detail Compose UI | T-A04 | Home: 오늘 헤드라인 + 100자 요약. Detail: 항목 카드(언론사·시각·짧은 요약·원문 Custom Tabs). UI 테스트 ≥ 2건 | UX 디테일 |
| T-A08 | Settings 화면(권한·알림 시각 표시·앱 정보) | T-A06, T-A07 | 알림 권한 토글, 알림 시각 고정 `07:00 KST` 표시, **LLM 키 입력 UI 없음** | 안내 문구 |
| T-A09 | 오류·오프라인 폴백(Room 30일 윈도) | T-A04, T-A07 | 네트워크/FCM 미수신 시 직전 캐시 표시 + "오프라인" 표지, 통합 테스트 그린 | 상태 머신 |
| T-A10 | (선택) HTTPS fetch 폴백(페이로드 4KB 초과 시 T-B09 호출) | T-A04, T-B09 | 페이로드에 `payload_overflow=true` 플래그 수신 시 Functions 엔드포인트 호출하여 다이제스트 본문 가져오기 | 인증 누락 |
| T-A11 | ProGuard/R8 + 릴리스 빌드 | T-A01~T-A09 | `bundleRelease` 산출, R8 후 스모크 그린(앱 실행 + 강제 FCM 트리거) | 리플렉션 규칙 |
| T-A12 | CI(GitHub Actions) — Android lint+test / Functions test / 태그 시 AAB + Functions deploy | T-A11, T-B08 | PR 워크플로 그린(android + backend 매트릭스), `v*` 태그 시 AAB 아티팩트 생성, Functions 배포(시크릿 주입) | 서명·서비스 계정 시크릿 |

---

## Backend 작업 단위 상세

### T-B01 Firebase 프로젝트 + Functions 스캐폴드

- **목적**: Cloud Functions 2nd gen + TypeScript 빌드·배포 토대 마련.
- **변경 대상(예상)**:
  - `backend/firebase.json`, `backend/.firebaserc`
  - `backend/functions/package.json`, `tsconfig.json`, `src/index.ts`
  - `backend/functions/.eslintrc.js`
- **의존**: 없음.
- **완료 기준**:
  - [ ] Firebase 프로젝트 생성, Blaze 플랜 활성, 예산 알림($1~5) 설정.
  - [ ] Node.js 20 LTS 기준 Functions 2nd gen 스캐폴드.
  - [ ] `firebase emulators:start --only functions` 로 `helloWorld` HTTPS 호출 가능.
  - [ ] `npm run build`(tsc) 성공.
- **위험·완화**: Spark 플랜이면 2nd gen 배포 불가 → 사전에 Blaze 전환 확인.

### T-B02 NewsData.io 클라이언트 + KST 윈도 계산

- **목적**: NewsData.io에서 지난 12시간(이상) KR 경제 뉴스 메타데이터 + 요약 텍스트 수집.
- **변경 대상**:
  - `backend/functions/src/news/newsdataClient.ts` — `fetchEconomyNews(window: KstWindow)`
  - `backend/functions/src/news/dto.ts` — NewsData.io 응답 스키마(zod 또는 io-ts 권장).
  - `backend/functions/src/time/kstWindow.ts` — `yesterdayKstWindow(nowUtc): { start: Date; end: Date }` (Asia/Seoul, 24h, DST 없음).
  - 테스트: `tests/newsdataClient.test.ts`, `tests/kstWindow.test.ts`.
- **의존**: T-B01.
- **완료 기준**:
  - [ ] 쿼리 파라미터: `country=kr`, `language=ko`, `category=business`.
  - [ ] 일 200req 한도 가드(연속 호출 시 페이지네이션 중단 기준 명시).
  - [ ] 12시간 지연 정책 명시(데이터가 12시간 이상 지연되어도 정상으로 간주).
  - [ ] MockWebServer/nock 단위테스트 ≥ 5 케이스.
- **위험**: 응답 스키마 변경 → DTO 검증으로 fail-fast.

### T-B03 Google Gemini 클라이언트 + 100자 후처리 + 프롬프트

- **목적**: 기사 집합을 단일 한국어 헤드라인(80~120자) + 항목별 짧은 요약으로 변환.
- **변경 대상**:
  - `backend/functions/src/summarize/geminiClient.ts` — `@google/genai` SDK 기반 호출(엔드포인트 `https://generativelanguage.googleapis.com/`, Vertex AI 아님). 모델 ID `gemini-2.5-flash`(1차), `gemini-2.0-flash`(폴백).
  - `backend/functions/src/summarize/prompts.ts` — 한국어, 키워드 위주, 100자 제약 시스템 프롬프트.
  - `backend/functions/src/summarize/lengthEnforcer.ts` — `enforceSummaryLength(text, { min: 80, max: 120 })` (코드포인트 기준, 줄바꿈 제거).
  - `backend/functions/src/summarize/rateLimiter.ts` — 10 RPM 토큰 버킷(호출 사이 ≥7초 슬립).
  - 테스트: `tests/lengthEnforcer.test.ts`, `tests/geminiClient.test.ts`, `tests/rateLimiter.test.ts`.
- **의존**: T-B01.
- **완료 기준**:
  - [ ] 기본 모델 ID = `gemini-2.5-flash`(상수로 분리, 환경변수 override 가능). 폴백 모델 = `gemini-2.0-flash`.
  - [ ] 호출 파라미터: `generationConfig.maxOutputTokens`, `generationConfig.temperature`(보수적 기본값).
  - [ ] `enforceSummaryLength` 케이스: 짧음(<80)/길음(>120)/이모지/한자/줄바꿈/공백/한자혼용/문장부호 ≥ 8건.
  - [ ] 호출 실패(429/5xx/타임아웃) 지수 백오프 1s, 2s, 4s, **최대 3회** 재시도. 영구 실패 시 `gemini-2.0-flash`로 폴백.
  - [ ] 호출 사이 ≥7초 슬립 또는 토큰 버킷으로 10 RPM 무료 한도 준수.
  - [ ] 키(`GEMINI_API_KEY`)는 코드/로그에 노출되지 않음(Secret Manager).
- **위험**: 모델 출력 길이 편차 → 후처리 단계에서 잘라내기/패딩 정책 명시. 무료 티어 한도 초과 시 폴백 모델로 자동 전환(같은 키, 한도 별도).

### T-B04 다이제스트 빌드 함수(수집→요약→Firestore 저장)

- **목적**: 한 트랜잭션 흐름으로 일일 다이제스트를 생성·영속.
- **변경 대상**:
  - `backend/functions/src/digest/buildDailyDigest.ts` — onSchedule 이전 단계의 순수 로직(테스트 가능).
  - `backend/functions/src/digest/firestoreRepo.ts` — `digests/{yyyy-MM-dd}` 문서 저장(KST 기준 date key).
  - `backend/functions/src/digest/model.ts` — `DailyDigest`(headline, items[], windowStart/End, createdAt, articleCount).
  - 테스트: `tests/buildDailyDigest.test.ts`(NewsData mock + Gemini mock).
- **의존**: T-B02, T-B03.
- **완료 기준**:
  - [ ] 통합 테스트: 기사 K건 → 다이제스트 1건 Firestore 영속.
  - [ ] 동일 일자 재실행 시 멱등(upsert), `createdAt`만 갱신.
  - [ ] 항목별 요약 N건 중 일부 실패 허용(부분 성공) + 구조화 로그.
  - [ ] Firestore 90일 보관 정책: `expiresAt` 필드 + TTL 정책 문서화(콘솔에서 TTL 설정 또는 별도 정리 job).
- **위험**: 부분 실패 정책 모호 → 정책표를 `architecture.md` §3에 명시.

### T-B05 Cloud Scheduler KST 07:00 트리거

- **목적**: 매일 KST 07:00에 다이제스트 빌드 함수 호출.
- **변경 대상**:
  - `backend/functions/src/index.ts` — `onSchedule({ schedule: '0 7 * * *', timeZone: 'Asia/Seoul' }, ...)` 핸들러.
  - `backend/firebase.json` — 필요 시 region(예: `asia-northeast3`) 설정.
- **의존**: T-B04.
- **완료 기준**:
  - [ ] 핸들러가 KST 07:00 Asia/Seoul 타임존으로 등록됨.
  - [ ] Functions Console에서 수동 trigger 가능.
  - [ ] 실패 시 Cloud Scheduler 자동 재시도(최대 3회) 정책 명시.
- **위험**: 서비스 계정 권한 누락 → 배포 가이드에 IAM 역할 명시(`roles/cloudfunctions.invoker`).

### T-B06 FCM 발송(topic `economy-news`) + 페이로드 빌더

- **목적**: 다이제스트 빌드 후 단말로 푸시.
- **변경 대상**:
  - `backend/functions/src/notify/fcm.ts` — `admin.messaging().send({ topic: 'economy-news', data: {...} })`.
  - `backend/functions/src/notify/payload.ts` — JSON 직렬화, 크기 측정(4KB 한도 체크), 초과 시 `payload_overflow=true` 플래그 + 본문 생략.
  - 테스트: `tests/payload.test.ts`(경계 케이스).
- **의존**: T-B04, T-B07.
- **완료 기준**:
  - [ ] 페이로드 스키마(아래 §데이터 계약 참조): `digest_id`, `date_kst`, `headline`, `items_json`(최대 5건), `total_count`, `payload_overflow`.
  - [ ] data-only 메시지(앱이 표시 시점·문구 제어). notification 객체는 사용하지 않음.
  - [ ] 4KB 초과 시 `items_json` 생략 + `payload_overflow=true`로 폴백 지시.
  - [ ] FCM 발송 실패 시 구조화 로그 + Cloud Scheduler 재시도에 의존.
- **위험**: 한글 4바이트 인코딩으로 한도 초과 → 단위테스트에서 한글 페이로드 크기 측정.

### T-B07 시크릿 관리

- **목적**: NewsData.io 키, Gemini API 키, FCM 서비스 계정을 안전하게 보관.
- **변경 대상**:
  - `backend/functions/src/secrets.ts` — `defineSecret('NEWSDATA_API_KEY')`, `defineSecret('GEMINI_API_KEY')`.
  - `backend/.env.local.example`, `backend/functions/.gitignore` — 로컬 개발용 분리.
  - `backend/SECRETS.md` 또는 README 절 — 운영자가 키 등록하는 절차(Google AI Studio 콘솔에서 `GEMINI_API_KEY` 발급 절차 포함).
- **의존**: T-B01.
- **완료 기준**:
  - [ ] Secret Manager에 키 저장, 함수가 `runWith({ secrets: [...] })`로 접근.
  - [ ] 로컬 에뮬레이터는 `.env.local`(git 무시)로 분리.
  - [ ] 로그·에러 메시지에 키 값이 직접 출력되지 않음.
  - [ ] 키 회전 절차 문서화.
- **위험**: 실수로 commit → `.gitignore` 검증 + `.env.local.example`만 추적.

### T-B08 Functions 단위/통합 테스트 + 에뮬레이터

- **목적**: 회귀 방지 및 로컬 개발 가능성.
- **변경 대상**:
  - `backend/functions/jest.config.js`(or vitest), `tests/**/*.test.ts`.
  - `backend/EMULATOR.md` — Functions/Firestore 에뮬레이터 사용법.
- **의존**: T-B02~T-B06.
- **완료 기준**:
  - [ ] `npm test` 핵심 유닛 그린(시간 윈도, NewsData 클라이언트, length enforcer, 페이로드 빌더, 다이제스트 빌드).
  - [ ] 에뮬레이터에서 종단 시나리오 1건(시간 강제 주입 + mock HTTP) 통과.
- **위험**: 실환경 차이 → 통합 테스트 매트릭스 명시.

### T-B09 (선택) 다이제스트 fetch HTTPS 엔드포인트

- **목적**: 페이로드 4KB 초과 시 폴백, 또는 앱 최초 진입 시 최신 다이제스트 동기 fetch.
- **변경 대상**:
  - `backend/functions/src/api/getLatestDigest.ts` — `onRequest` 또는 `onCall`(App Check 필수).
- **의존**: T-B04.
- **완료 기준**:
  - [ ] App Check 또는 Firebase Auth Anonymous 토큰으로만 호출 가능.
  - [ ] 응답: 최신 다이제스트 JSON(또는 `?date=yyyy-MM-dd`).
  - [ ] CORS는 앱 패키지만 허용(필요 시).
- **위험**: 익명 사용 → 남용 방지 위해 App Check 의무화.

---

## Android 작업 단위 상세

### T-A01 Gradle/Compose/Hilt 스캐폴드

- **목적**: 빌드·DI·Compose 토대.
- **변경 대상(예상)**:
  - `android/settings.gradle.kts`, `android/build.gradle.kts`, `android/app/build.gradle.kts`
  - `android/gradle/libs.versions.toml`
  - `android/app/src/main/AndroidManifest.xml`, `EconomyNewsApp.kt`, `MainActivity.kt`
- **의존**: 없음.
- **완료 기준**:
  - [ ] Kotlin 2.x + AGP 최신 안정 + Compose Compiler.
  - [ ] `minSdk=26`, `targetSdk=최신(34 이상)`.
  - [ ] Version Catalog, Hilt(`@HiltAndroidApp`), Compose Material 3 적용.
  - [ ] `./gradlew :app:assembleDebug` 성공.
- **위험·완화**: AGP/Compose 호환성 → 사용 시점 안정 버전 매트릭스 확인.

### T-A02 도메인 모델 + Port 인터페이스

- **목적**: 외부 의존성 경계 고정.
- **변경 대상**:
  - `domain/model/DailyDigest.kt`, `DigestItem.kt`(언론사·시각·짧은 요약·원문 URL), `Source.kt`.
  - `domain/port/DigestRepository.kt`, `NotificationPort.kt`, `ClockPort.kt`, `DigestFetchPort.kt`(폴백 HTTPS).
  - `domain/usecase/ObserveLatestDigestUseCase.kt`, `IngestDigestUseCase.kt`(FCM 페이로드 수신 → 검증 → 저장 → 알림).
- **의존**: T-A01.
- **완료 기준**:
  - [ ] 모델 `data class`, Android 의존성 0.
  - [ ] UseCase는 Coroutines(`suspend`/`Flow`).
  - [ ] 단위테스트 컴파일·실행 그린.
- **위험**: 모델 누락 → T-A04 통합 단계 사양 §3 체크.

### T-A03 Firebase BoM + FCM SDK + Messaging Service + 토픽 구독

- **목적**: FCM 수신·토픽 구독.
- **변경 대상**:
  - `app/google-services.json` (CI/리포지토리 정책에 따라 처리; 시크릿은 CI 주입).
  - `app/build.gradle.kts` — Firebase BoM, `firebase-messaging`.
  - `services/EconomyFcmService.kt`(`FirebaseMessagingService` 상속), `EconomyNewsApp.onCreate` 또는 첫 진입 시 `subscribeToTopic("economy-news")`.
- **의존**: T-A01.
- **완료 기준**:
  - [ ] 앱 부팅 시 `economy-news` 토픽 구독 성공.
  - [ ] `EconomyFcmService.onMessageReceived`에 data 페이로드가 도달함을 로그/테스트로 확인.
  - [ ] 알림 권한 미허용 환경에서도 데이터 메시지는 수신되는지 검증.
- **위험**: google-services.json 누락 → CI 시크릿 절차 명시.

### T-A04 다이제스트 페이로드 파싱 + Room 캐시 + 30일 정리

- **목적**: FCM data 페이로드를 검증·저장·관찰.
- **변경 대상**:
  - `data/remote/PushPayloadParser.kt` — `Map<String,String>` → `DailyDigest`.
  - `data/local/DigestDao.kt`, `DigestEntity.kt`, `DigestItemEntity.kt`, `AppDatabase.kt`.
  - `data/repository/DigestRepositoryImpl.kt` — `observeLatest()`, `upsert(digest)`, `purgeOlderThan(days=30)`.
  - 테스트: 파서 케이스, DAO 통합 테스트, 30일 윈도 청소 단위테스트.
- **의존**: T-A02, T-A03.
- **완료 기준**:
  - [ ] 페이로드 스키마 검증 실패 시 폴백 fetch(T-A10) 또는 마지막 캐시 유지.
  - [ ] Room 단일 진실 소스로 노출(Flow).
  - [ ] 31일 이상 항목 자동 삭제(다음 수신 시 트리거 또는 앱 시작 시).
- **위험**: 스키마 변경 → 백엔드와 데이터 계약 문서화(§데이터 계약).

### T-A05 SummaryLengthEnforcer (클라이언트 2차 검증)

- **목적**: 백엔드 1차 검증 외, 표시 직전에 다시 80~120자 보장.
- **변경 대상**:
  - `domain/text/SummaryLengthEnforcer.kt` — 코드포인트 기준, 줄바꿈 제거, 키워드 위주 후처리.
  - 테스트: `SummaryLengthEnforcerTest.kt` ≥ 8 케이스.
- **의존**: T-A02.
- **완료 기준**:
  - [ ] 80 미만 시 표시(원문 그대로 + 경고 로그), 120 초과 시 안전한 잘라내기(어절 경계 우선).
  - [ ] 이모지/한자/공백/줄바꿈 케이스 그린.
- **위험**: 잘라내기 미관 → 어절 경계 휴리스틱 유닛테스트.

### T-A06 알림 채널 + 시스템 알림 + 딥링크

- **목적**: 사용자에게 알림 표시.
- **변경 대상**:
  - `platform/notification/NotificationChannels.kt` — `daily_digest`, IMPORTANCE_HIGH.
  - `platform/notification/DailyDigestNotifier.kt` — `NotificationCompat.Builder`, 본문=헤드라인, 부제목=`원문 N건`.
  - `presentation/navigation/DeepLinks.kt` — 알림 탭 → `economynews://digest/{date}`.
- **의존**: T-A04, T-A05.
- **완료 기준**:
  - [ ] 강제 트리거(adb로 FCM data 모의) 시 알림 게시.
  - [ ] 단일 채널, 그룹화 없음.
  - [ ] 권한 미허용 시 알림 미게시 + 인앱 안내.
- **위험**: Android 13+ 권한 거부 → Settings 화면에 재요청 경로 제공.

### T-A07 Home/Detail Compose UI

- **목적**: 진입 시 오늘의 다이제스트 표시.
- **변경 대상**:
  - `presentation/home/HomeScreen.kt`, `HomeViewModel.kt` — 헤드라인 + 100자 요약 + 생성 시각(KST).
  - `presentation/detail/DigestDetailScreen.kt`, `DetailViewModel.kt` — 항목 카드(언론사·시각·짧은 요약·원문 링크).
  - `presentation/navigation/NavGraph.kt` — 알림 딥링크 처리.
  - 원문 링크는 `androidx.browser`(Custom Tabs).
- **의존**: T-A04.
- **완료 기준**:
  - [ ] Home/Detail 빈/로딩/에러 상태 분기.
  - [ ] Compose UI 테스트 ≥ 2건.
  - [ ] 카테고리 필터 없음(통합 다이제스트 단일).
- **위험**: 디자인 미합의 → Material 3 기본 컴포넌트로 단순 카드.

### T-A08 Settings 화면

- **목적**: 권한·알림 시각·앱 정보 표시.
- **변경 대상**:
  - `presentation/settings/SettingsScreen.kt`, `SettingsViewModel.kt`.
  - `data/local/SettingsDataStore.kt`(필요 시).
- **의존**: T-A06, T-A07.
- **완료 기준**:
  - [ ] 알림 시각 고정 표시 `07:00 KST`(편집 불가).
  - [ ] Android 13+ `POST_NOTIFICATIONS` 권한 요청 UI.
  - [ ] **LLM 키 입력 UI 없음**(백엔드 프록시).
  - [ ] 앱 정보(버전, 개인정보처리방침 링크 placeholder).
- **위험**: 개인정보처리방침 URL 미정 → Q8(보안검토)에서 확정.

### T-A09 오류·오프라인 폴백

- **목적**: 네트워크/FCM 미수신·페이로드 손상 등에서 사용성 유지.
- **변경 대상**:
  - `presentation/common/UiState.kt`, repository에서 `Result<T>` 또는 sealed UiState.
- **의존**: T-A04, T-A07.
- **완료 기준**:
  - [ ] 네트워크 차단/미수신 시 Room 최근 30일 중 최신 항목 표시 + "오프라인" 표지.
  - [ ] 페이로드 검증 실패 시 마지막 캐시 유지 + 사용자 가시 오류 메시지.
  - [ ] 통합 테스트 그린.
- **위험**: 부분 실패 정책 → `architecture.md` §3 정책표 준수.

### T-A10 (선택) HTTPS fetch 폴백

- **목적**: 페이로드 4KB 초과 시(또는 최초 진입 시) Functions 엔드포인트에서 다이제스트 본문 가져오기.
- **변경 대상**:
  - `data/remote/DigestApi.kt` — Retrofit + OkHttp.
  - `data/repository/DigestFetcher.kt`.
- **의존**: T-A04, T-B09.
- **완료 기준**:
  - [ ] `payload_overflow=true` 페이로드 수신 시 자동으로 fetch.
  - [ ] App Check 토큰 부착.
  - [ ] 실패 시 마지막 캐시 유지.
- **위험**: 인증 누락 → App Check 의무화.

### T-A11 ProGuard/R8 + 릴리스

- **목적**: AAB 산출.
- **변경 대상**:
  - `app/proguard-rules.pro`(Retrofit/Serialization/Hilt/Room/Firebase 규칙).
  - `app/build.gradle.kts` — `release { isMinifyEnabled=true; isShrinkResources=true }`.
- **의존**: T-A01~T-A09.
- **완료 기준**:
  - [ ] `./gradlew :app:bundleRelease` 성공.
  - [ ] R8 후 스모크(앱 실행 + 강제 FCM 트리거) 통과.
- **위험**: 리플렉션 직렬화 → `@Keep`/`@Serializable` 규칙 명시.

### T-A12 CI(GitHub Actions)

- **목적**: 회귀 방지 + 자동 배포.
- **변경 대상**:
  - `.github/workflows/ci.yml` — PR 매트릭스: (a) Android `assembleDebug`+`lint`+`test`, (b) Backend `npm test`+`tsc`.
  - `.github/workflows/release.yml` — `v*` 태그: AAB 빌드/업로드, Functions deploy(`firebase deploy --only functions`).
- **의존**: T-A11, T-B08.
- **완료 기준**:
  - [ ] PR 워크플로 그린(android + backend).
  - [ ] 태그 푸시 시 AAB 아티팩트 생성 + Functions 자동 배포(서명·서비스 계정 시크릿 주입).
  - [ ] `google-services.json`은 CI 시크릿에서 디코드해 주입.
- **위험**: 시크릿 노출 → GitHub Secrets, base64 키스토어, 서비스 계정 JSON 모두 환경변수 격리.

---

## 데이터 계약 (Backend ↔ Android FCM 페이로드)

FCM data message(텍스트 키-값만, 모든 값은 문자열):

| 키 | 의미 | 예시 |
| --- | --- | --- |
| `schema_version` | 페이로드 버전 | `"1"` |
| `digest_id` | 다이제스트 식별자(=`date_kst`) | `"2026-05-21"` |
| `date_kst` | 다이제스트 기준일(KST yyyy-MM-dd) | `"2026-05-21"` |
| `headline` | 80~120자 한국어 헤드라인 | `"…"` |
| `total_count` | 원문 기사 수 | `"7"` |
| `items_json` | 항목 카드 JSON 배열(최대 5건) | `"[{\"source\":...}]"` |
| `payload_overflow` | 4KB 초과로 본문 생략 여부 | `"true"`/`"false"` |
| `created_at_utc` | 백엔드 생성 시각 ISO8601 | `"2026-05-21T22:00:05Z"` |

`items_json` 단일 항목 스키마: `source`(언론사명), `published_at_utc`, `title`, `short_summary`(<= 60자), `url`.

페이로드 한도 초과 가드는 백엔드(T-B06)에서 수행하고, 초과 시 `payload_overflow=true` + `items_json` 생략. 앱은 T-A10으로 폴백.

---

## 후속 확정 필요(Open items)

- **Q8 개인정보처리방침/데이터 안전**: 담당 `security-compliance`. T-A08 Settings의 정책 URL 플레이스홀더는 보안 검토 단계에서 실제 URL로 교체.
- **시크릿 운영자 책임**: GCP 프로젝트 소유자, Google AI Studio(`GEMINI_API_KEY`) 관리자, Play Console 서명 키 관리자 지정. release-engineer가 M11에서 문서화.
- **App Check 도입 여부**: T-B09/T-A10 선택 작업 단위에 영향. 페이로드 4KB 내로 일관 가능하면 보류 가능. 보안 검토에서 최종 확정.

---

## 부록 A. 의존성 확정 요약 (Q5)

### Android

- Kotlin, Jetpack Compose, Material 3.
- Coroutines/Flow.
- Retrofit + OkHttp + Kotlinx Serialization(폴백 fetch용; T-A10 채택 시).
- **Room**(다이제스트 캐시; 30일 보관).
- Hilt DI.
- Firebase BoM + FCM(`firebase-messaging`).
- **WorkManager 미사용**(트리거는 FCM이므로 불필요).
- `androidx.browser`(Custom Tabs).

### Backend

- Node.js 20 LTS + TypeScript.
- `firebase-functions` 2nd gen + `firebase-admin`.
- HTTP 클라이언트: `node-fetch` 또는 `undici`.
- 스키마 검증: `zod`(권장).
- Google Gemini SDK(`@google/genai`, 최신 안정) — 1차 모델 ID 기본값 `gemini-2.5-flash`, 폴백 `gemini-2.0-flash`. AI Studio 무료 티어(`https://generativelanguage.googleapis.com/`, Vertex AI 아님). 환경변수 `GEMINI_API_KEY`.
- 테스트: `jest` 또는 `vitest`.
- 린트: ESLint + `@typescript-eslint`.
