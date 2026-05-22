# 아키텍처 설계 (Architecture)

> 본 문서는 사양(`docs/project-spec.md`)과 외부 의존성 확정 결과(`docs/research/q13-naver-news.md`, `docs/research/q14-serverless-backend.md`, Q3/Q4/Q9 RESOLVED)를 반영한 단일 채택 아키텍처다. 분기 항목은 모두 제거되었다.

---

## 1. 설계 원칙

- **다이제스트 생성은 백엔드에서**: NewsData.io 수집과 Anthropic Claude(`claude-haiku-4-5-20251001`) 요약은 Firebase Cloud Functions에서 수행한다. 클라이언트(Android 앱)는 **표시·캐시·알림**만 담당한다. 클라이언트에는 LLM/뉴스 API 키가 일절 존재하지 않는다.
- **서버 트리거**: 정시성(KST 07:00)은 Cloud Scheduler(`Asia/Seoul`)로 보장한다. 단말 측 정시 알람(WorkManager/AlarmManager)은 사용하지 않으므로 OEM Doze·Android 14 exact alarm 제약과 무관하다.
- **단방향 데이터 흐름(클라이언트)**: FCM 수신 → UseCase → Repository → Room → UI(Flow 구독).
- **레이어 격리(클라이언트)**: presentation은 domain에만 의존, domain은 인터페이스만 노출, data가 인터페이스를 구현.
- **오프라인 우선(클라이언트)**: 최근 30일 다이제스트는 Room에 영속화되어 네트워크/FCM 미수신 시에도 직전 결과 표시 가능.
- **최소 권한**: 앱은 `INTERNET`, `POST_NOTIFICATIONS`만 사용.
- **시크릿은 서버에**: NewsData.io 키, Anthropic 키, FCM 서비스 계정 키는 Google Cloud Secret Manager에 보관.

---

## 2. 레이어 구성

### 2-1. 전체 시스템 컴포넌트 다이어그램

```
+---------------------------------------------------------------+
|                       Google Cloud (GCP)                      |
|                                                               |
|   +-----------------+      +-----------------------------+    |
|   | Cloud Scheduler | ---> | Cloud Functions 2nd gen      |   |
|   | 0 7 * * *       |      |   (Node.js 20 + TS)          |   |
|   | tz=Asia/Seoul   |      |                              |   |
|   +-----------------+      |  buildDailyDigest()          |   |
|                            |    1. fetch NewsData.io      |---+--> https://newsdata.io
|                            |    2. summarize via Anthropic |---+--> https://api.anthropic.com
|                            |    3. save digest -> Firestore|   |
|                            |    4. send FCM topic message  |   |
|                            +--------+----------------------+   |
|                                     |                          |
|                            +--------v---------+ +------------+ |
|                            | Cloud Firestore  | | Secret Mgr | |
|                            | digests/{date}   | | API keys   | |
|                            | 90d TTL          | +------------+ |
|                            +------------------+                |
|                                                                |
|                            +-------------------+               |
|                            | Firebase Cloud    |               |
|                            | Messaging (FCM)   |               |
|                            | topic: economy-   |               |
|                            |   news            |               |
|                            +---------+---------+               |
+--------------------------------------|-------------------------+
                                       |
                                       v   (data-only message)
+---------------------------------------------------------------+
|                       Android 앱                              |
|                                                               |
|  EconomyFcmService(FirebaseMessagingService)                  |
|     -> IngestDigestUseCase                                    |
|         -> PushPayloadParser                                  |
|         -> SummaryLengthEnforcer(2차 검증)                    |
|         -> DigestRepository.upsert + purgeOlderThan(30d)      |
|         -> DailyDigestNotifier.notify()                       |
|                                                               |
|  Compose UI: HomeScreen / DigestDetailScreen / SettingsScreen |
|     -> ObserveLatestDigestUseCase  (Flow<DailyDigest>)        |
|     -> DigestRepositoryImpl(Room)                             |
|                                                               |
|  (선택) DigestApi(HTTPS) <-> Functions getLatestDigest         |
|     - 페이로드 4KB 초과 시 폴백                                |
+---------------------------------------------------------------+
```

### 2-2. Backend 레이어 (Node.js + TypeScript)

```
backend/functions/src/
  index.ts                        (onSchedule, HTTPS handlers)
  digest/
    buildDailyDigest.ts           (오케스트레이션: collect -> summarize -> persist -> notify)
    firestoreRepo.ts              (digests/{date_kst})
    model.ts                      (DailyDigest, DigestItem)
  news/
    newsdataClient.ts             (NewsData.io API)
    dto.ts                        (zod 스키마)
  summarize/
    anthropicClient.ts            (Claude haiku 4.5 호출)
    prompts.ts                    (한국어 100자 요약 시스템 프롬프트)
    lengthEnforcer.ts             (80~120자 후처리, 1차 검증)
  notify/
    fcm.ts                        (admin.messaging().send)
    payload.ts                    (페이로드 빌더 + 4KB 가드)
  time/
    kstWindow.ts                  (Asia/Seoul 24h 윈도)
  api/
    getLatestDigest.ts            (선택, App Check 보호)
  secrets.ts                      (defineSecret)
```

### 2-3. Android 레이어 (Kotlin + Compose)

```
android/app/src/main/java/.../
  presentation/
    home/ HomeScreen, HomeViewModel
    detail/ DigestDetailScreen, DetailViewModel
    settings/ SettingsScreen, SettingsViewModel
    navigation/ NavGraph, DeepLinks
    common/ UiState
  domain/
    model/ DailyDigest, DigestItem, Source
    port/ DigestRepository, NotificationPort, ClockPort, DigestFetchPort
    usecase/ ObserveLatestDigestUseCase, IngestDigestUseCase
    text/ SummaryLengthEnforcer
  data/
    remote/ PushPayloadParser, DigestApi (선택), DigestFetcher (선택)
    local/ AppDatabase, DigestDao, DigestEntity, DigestItemEntity, SettingsDataStore
    repository/ DigestRepositoryImpl
  platform/
    notification/ NotificationChannels, DailyDigestNotifier
  services/
    EconomyFcmService (FirebaseMessagingService)
  EconomyNewsApp (Hilt @HiltAndroidApp)
  MainActivity
```

### 2-4. 모듈 구성

- 초기: 단일 모듈 `:app`(android), 단일 패키지 `functions`(backend).
- 향후 분리 권고: `:core-common`(시간 유틸/UiState), `:core-database`(Room), `:feature-digest`, `:feature-settings`. T-A07 이후 별도 리팩토링 작업으로 검토.

---

## 3. 데이터 흐름

### 3-1. 백엔드 다이제스트 빌드 파이프라인 (KST 07:00 trigger)

```
[Cloud Scheduler] 0 7 * * *  Asia/Seoul
        |
        v
[Cloud Functions: onSchedule handler]
        |
        v
buildDailyDigest()
   1. window = yesterdayKstWindow(now)   // [어제 00:00 KST, 오늘 00:00 KST)
   2. articles = newsdataClient.fetchEconomyNews(window)
        - GET https://newsdata.io/api/1/news
          ?apikey=*** &country=kr &language=ko &category=business
        - 12h 지연 허용
        - 일 200req 가드(페이지네이션 중단 기준)
   3. headline, items = anthropicClient.summarize(articles, prompts.SYSTEM)
        - model = "claude-haiku-4-5-20251001"
        - 한국어, 키워드 위주, 100자 제약
   4. lengthEnforcer.enforce(headline, {min:80, max:120})   // 1차 검증
   5. firestoreRepo.upsert("digests/" + date_kst, digest)   // expiresAt = +90d
   6. fcm.send(payloadBuilder.build(digest))                // topic: economy-news
        - 4KB 초과 시 items_json 생략 + payload_overflow=true
```

**부분 실패 정책**:

| 실패 단계 | 처리 |
| --- | --- |
| NewsData.io 전체 실패 | 다이제스트 미생성, Cloud Scheduler 재시도 의존, 구조화 로그 |
| NewsData.io 일부 페이지 실패 | 수집된 분량으로 진행, 로그에 누락 명시 |
| Anthropic 헤드라인 실패 | 다이제스트 미생성, 재시도 후 실패 시 알림 미발송 |
| Anthropic 항목별 요약 일부 실패 | 해당 항목은 원문 제목으로 대체, 전체 진행 |
| Firestore 저장 실패 | 다이제스트 미발송, Cloud Scheduler 재시도 |
| FCM 발송 실패 | 구조화 로그, 다음 날 재시도(수동 강제 가능) |

### 3-2. 클라이언트 FCM 수신 파이프라인

```
[FCM data message 수신]
        |
        v
EconomyFcmService.onMessageReceived(remoteMessage)
        |
        v
IngestDigestUseCase(payload)
   1. PushPayloadParser.parse(payload)            // schema_version 검증
   2. if payload_overflow == true:
        DigestFetchPort.fetchLatest()             // T-A10/T-B09 (선택)
   3. SummaryLengthEnforcer.enforce(headline)     // 2차 검증
   4. DigestRepository.upsert(digest)
   5. DigestRepository.purgeOlderThan(days=30)
   6. NotificationPort.notify(digest)
        - 채널: daily_digest (IMPORTANCE_HIGH)
        - 본문: headline (80~120자)
        - 부제목: "원문 N건"
        - 탭 → economynews://digest/{date_kst}
```

### 3-3. UI 표시 (포그라운드)

```
HomeScreen
   -> HomeViewModel.uiState : StateFlow<HomeUiState>
   -> ObserveLatestDigestUseCase()  // Flow<DailyDigest?>
   -> DigestRepositoryImpl.observeLatest()  // Room Flow

DigestDetailScreen(dateKst)
   -> DetailViewModel
   -> DigestRepository.getByDate(dateKst)
   -> 원문 링크는 Custom Tabs(androidx.browser)

SettingsScreen
   -> 알림 권한 토글(POST_NOTIFICATIONS)
   -> 알림 시각 표시(고정 07:00 KST, 편집 불가)
   -> 앱 정보, 개인정보처리방침 링크(Q8에서 확정)
```

---

## 4. 의존성 다이어그램 (ASCII, 클라이언트)

```
                    +-------------------+
                    |   HomeViewModel   |
                    +---------+---------+
                              |
              +---------------+----------------+
              |                                |
              v                                v
+---------------------------+    +----------------------------+
| ObserveLatestDigestUseCase|    | IngestDigestUseCase        |
+-------------+-------------+    +--------------+-------------+
              |                                 |
              v                                 v
        +-----+----------+               +------+--------+
        | DigestRepository|              | PushPayload   |
        | (port)         |               | Parser        |
        +-----+----------+               +------+--------+
              |                                 |
              v                                 |
        +-----+-----+                           |
        | Room DB   |<--------------------------+
        +-----------+
              ^
              |
        +-----+-----+
        | EconomyFcm|  (FirebaseMessagingService)
        | Service   |
        +-----------+
```

---

## 5. KST 시간 처리 정책

- **저장은 UTC**: `created_at_utc`, `published_at_utc` 등 모든 타임스탬프는 UTC ISO8601.
- **윈도 계산만 KST**: 백엔드 `kstWindow.ts`와 클라이언트 표시 포맷팅에서 `Asia/Seoul`을 사용한다. KST는 DST가 없어 변환 단순.
- **다이제스트 키**: `digest_id = date_kst (yyyy-MM-dd)`. 동일 일자 재처리는 멱등 upsert.
- **Cloud Scheduler**: `0 7 * * *` + `timeZone=Asia/Seoul` → KST 07:00 ± 1분 보장(GCP SLA).

---

## 6. 영속성 스키마

### 6-1. Android Room

- `digests` 테이블
  - `date_kst` TEXT PK (`yyyy-MM-dd`)
  - `headline` TEXT
  - `total_count` INTEGER
  - `created_at_utc` INTEGER (epoch millis)
  - `payload_overflow` INTEGER (0/1)
- `digest_items` 테이블
  - `id` INTEGER PK AUTOINCREMENT
  - `digest_date_kst` TEXT FK
  - `order_index` INTEGER
  - `source` TEXT
  - `published_at_utc` INTEGER
  - `title` TEXT
  - `short_summary` TEXT
  - `url` TEXT
- 인덱스: `digests(created_at_utc DESC)`, `digest_items(digest_date_kst, order_index)`.
- 보관: 최근 30일. 31일 이상 항목은 FCM 수신 시 또는 앱 시작 시 `purgeOlderThan(30)` 호출로 삭제.

### 6-2. Firestore (백엔드)

- 컬렉션 `digests`, 문서 ID = `date_kst` (`yyyy-MM-dd`).
- 필드:
  - `date_kst` (string)
  - `headline` (string, 80~120자)
  - `total_count` (number)
  - `items` (array<{ source, published_at_utc, title, short_summary, url }>)
  - `created_at_utc` (timestamp)
  - `expires_at` (timestamp, `created_at_utc + 90d`)
- 보관: 90일. Firestore TTL 정책(`expires_at`) 활성화로 자동 삭제(저장 비용 절감).
- 인덱스: `created_at_utc DESC` (단일 필드, 기본 제공).

---

## 7. 위협 모델

| 자산 | 위협 | 대응 |
| --- | --- | --- |
| NewsData.io API 키 | 디컴파일/스니핑 | **클라이언트에 키 없음**. Google Cloud Secret Manager 저장, Functions `defineSecret()`로 접근. |
| Anthropic API 키 | 디컴파일/스니핑 | **클라이언트에 키 없음**. Secret Manager 저장. |
| FCM 서비스 계정 키 | 깃 커밋, CI 노출 | Secret Manager + CI GitHub Secrets, `.gitignore` 검증, 키 회전 절차 문서화. |
| 네트워크(앱↔FCM, 앱↔Functions) | MITM, TLS downgrade | `usesCleartextTraffic=false`, OkHttp `ConnectionSpec.MODERN_TLS`. 인증서 핀닝은 회전 부담을 고려해 옵션 처리. |
| FCM 페이로드 위변조 | data message 위조 | Firebase FCM은 서비스 계정 인증 필수 → 외부에서 같은 토픽으로 전송 불가. 추가로 페이로드에 `schema_version`/필드 검증. |
| 폴백 fetch 엔드포인트 | 익명 남용 | App Check 의무화(T-A10/T-B09 채택 시). |
| 알림 권한 남용 | Android 13+ 거부 시 무알림 | 첫 진입 시 권한 안내, 거부 시 Settings에서 재요청 경로. |
| 사용자 데이터 | 개인정보 수집(현재 가정: 없음) | 분석 SDK 미도입. FCM 토큰은 토픽 구독에 사용(개별 토큰 저장 없음). |
| 비용 폭증 | LLM/Functions 호출 폭증 | GCP 예산 알림($1~5) + Cloud Functions max instances 제한 + Cloud Scheduler 단일 trigger. |

---

## 8. 외부 의존성 (확정)

| 영역 | 채택 | 비고 |
| --- | --- | --- |
| 뉴스 소스 | **NewsData.io** | 무료 플랜, 상업용 허용. `country=kr&language=ko&category=business`. 12시간 지연 허용. 일 200req 한도. 근거: `docs/research/q13-naver-news.md` 4절. |
| 서버리스 백엔드 | **Firebase Cloud Functions 2nd gen + Cloud Scheduler + FCM** | 월 $0(Blaze 무료 한도 내). Asia/Seoul 타임존 직접 지원. 런타임 Node.js 20 LTS. 근거: `docs/research/q14-serverless-backend.md`. |
| 알림 트리거 | **Cloud Scheduler → Cloud Functions → FCM data message** | 단말 측 정시 알람 미사용. |
| 요약 LLM | **Anthropic Claude** | 모델 ID 기본값 `claude-haiku-4-5-20251001`. 백엔드 프록시 경유. |
| 푸시 전달 | **Firebase Cloud Messaging (topic: `economy-news`)** | data-only 메시지. 발송 무제한 무료. |
| 시크릿 보관 | **Google Cloud Secret Manager** | `defineSecret()` API 접근. |
| 앱 클라이언트 | **Kotlin + Jetpack Compose + Material 3** | minSdk=26, targetSdk=최신(34+). Hilt, Room, Retrofit/OkHttp(폴백용), `androidx.browser`. WorkManager 미사용. |

### "100자 내외" 정의(Q6 확정)

- 공백 포함 한글 코드포인트 기준 **80~120자**.
- 줄바꿈 제거. 키워드 중심 문체.
- **백엔드(`lengthEnforcer.ts`)에서 1차 검증, 클라이언트(`SummaryLengthEnforcer.kt`)에서 표시 직전 2차 검증**.

---

## 9. 비기능 보장

- **정시성**: Cloud Scheduler가 KST 07:00 `Asia/Seoul` cron으로 호출하므로 KST 07:00 ± 1분 보장. OEM Doze/Android 14 exact alarm 제약 무관(서버 트리거). 정시성 SLA는 GCP Cloud Scheduler에 위임.
- **오프라인**: Room 최근 30일 캐시를 단일 진실 소스로 노출(Flow). 네트워크/FCM 미수신과 무관하게 최신 캐시 표시.
- **접근성**: Compose 폰트 스케일 따름, 색 대비 WCAG AA 목표.
- **로깅**: 디버그 빌드에서만 OkHttp `HttpLoggingInterceptor.Level.BODY`, 릴리스는 `NONE`. 백엔드는 구조화 로그(JSON) + Cloud Logging.
- **비용**(`docs/research/q14-serverless-backend.md` 기준 인용):
  - Cloud Scheduler: $0(3 job 무료 한도 내, 1 job 사용).
  - Cloud Functions: $0(2,000,000 호출/월 무료 한도, 일 1회 부하).
  - FCM: $0(발송 무제한 무료).
  - Secret Manager: 사실상 $0(일 1회 접근 수준).
  - Firestore: 무료 한도 내($0 예상, 90일 TTL).
  - NewsData.io: $0(무료 플랜, 일 200req).
  - Anthropic Claude API: 사용량 과금(앱 1회/일 호출, Q14 조사 기준 월 $0.10 미만 예상).
  - **합계(인프라)**: 월 $0 수준, LLM 비용만 사용량 종량제.

---

## 10. 후속 확정 사항

- **Q8 개인정보처리방침/데이터 안전 섹션**: 담당 `security-compliance`. 클라이언트는 사용자 식별 데이터를 수집하지 않으며(FCM 토픽 구독만 사용), 백엔드는 NewsData.io에 사용자 식별자를 보내지 않음. 정책 URL과 Play Console 데이터 안전 폼은 보안 검토 단계에서 확정.
- **App Check 도입**: T-B09 폴백 엔드포인트를 사용할지에 따라 결정. 페이로드 4KB 내로 일관 가능하면 보류.
- **GCP 프로젝트/시크릿 운영자 책임**: release-engineer가 M11에서 문서화(키 회전 주기, 콘솔 접근 권한자).
