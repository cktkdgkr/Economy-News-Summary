# 아키텍처 설계 (Architecture)

> 본 문서는 사양(`docs/project-spec.md`)과 미해결 질문(`docs/open-questions.md`)을 입력으로 한 초기 아키텍처 설계다. researcher의 Q1~Q4 결과에 따라 일부 구성요소(특히 데이터 소스 어댑터, 요약기 호출 위치, 알림 트리거)는 **분기 확정**된다.

---

## 1. 설계 원칙

- **단방향 데이터 흐름**: WorkManager(또는 FCM 수신기) → UseCase → Repository → DataSource(원격/로컬) → DB → UI(Flow 구독).
- **레이어 격리**: presentation은 domain에만 의존, domain은 인터페이스만 노출, data가 인터페이스를 구현.
- **테스트 가능성**: 도메인 로직(시간 윈도 계산, 요약 후처리)은 순수 함수. 외부 의존성은 인터페이스로 추상화.
- **오프라인 우선**: 마지막 성공 다이제스트는 Room에 영속화되어 네트워크 실패 시에도 표시 가능.
- **최소 권한**: `INTERNET`, `POST_NOTIFICATIONS`만 사용. 백그라운드 위치/저장소 등 추가 권한 없음.

---

## 2. 레이어 구성

```
+---------------------------------------------------------------+
|  presentation (Jetpack Compose, Material 3)                   |
|  - HomeScreen / DigestDetailScreen / SettingsScreen           |
|  - ViewModel (StateFlow)                                      |
+---------------------------------------------------------------+
                 |  (UiState, Intent)
                 v
+---------------------------------------------------------------+
|  domain (Pure Kotlin)                                         |
|  - Models: Article, ArticleSummary, DailyDigest               |
|  - UseCases: BuildDailyDigestUseCase, GetLatestDigestUseCase, |
|              ObserveDigestsUseCase                            |
|  - Ports(interface): NewsRepository, SummarizerPort,          |
|              DigestRepository, NotificationPort, ClockPort    |
+---------------------------------------------------------------+
                 |  (interfaces)
                 v
+---------------------------------------------------------------+
|  data                                                         |
|  - remote: BigKindsRemoteDataSource (API or Scraping; Q1/Q2)  |
|            LlmRemoteDataSource (Q4 분기)                       |
|  - local : Room DAOs (ArticleDao, DigestDao, SummaryDao)      |
|            DataStore<Preferences>                              |
|  - repository: NewsRepositoryImpl, DigestRepositoryImpl       |
+---------------------------------------------------------------+
                 |
                 v
+---------------------------------------------------------------+
|  platform                                                     |
|  - WorkManager(DailyDigestWorker) / FCM (조건부, Q3 분기)      |
|  - NotificationManagerCompat (Notification Channel)           |
|  - Hilt (DI 컨테이너)                                          |
+---------------------------------------------------------------+
```

### 모듈 구성
- 시작: 단일 모듈 `:app`.
- 추후 분리 권고(작업 단위가 커질 때):
  - `:core-common`(시간 유틸, 결과 타입), `:core-network`(OkHttp/Retrofit 공통), `:core-database`(Room).
  - `:feature-digest`(홈/상세 UI + UseCase), `:feature-settings`.
- 모듈 분리는 T-08 이후 별도 리팩토링 작업으로 고려(초기에는 패키지 분리만).

---

## 3. 데이터 흐름

### 3-1. 일일 다이제스트 생성 (백그라운드)

```
[Trigger: KST 07:00]
  Q3 결과가 (b) WorkManager + 로컬 알림이면:
    AlarmManager(setExactAndAllowWhileIdle) or WorkManager(PeriodicWork)
        -> DailyDigestWorker.doWork()

  Q3 결과가 (a) 백엔드 cron + FCM이면:
    FCM data message 수신 -> EnqueueDigestWorker -> DailyDigestWorker

        |
        v
  BuildDailyDigestUseCase(date = yesterdayKst)
        |
        v
  NewsRepository.fetchArticlesInWindow(start, end)
     -> BigKindsRemoteDataSource (Q1/Q2 분기)
     -> ArticleDao.upsertAll()
        |
        v
  SummarizerPort.summarizeBatch(articles)
     -> LlmRemoteDataSource (Q4 분기: 백엔드 프록시 vs 온디바이스)
     -> 100자 ±20 후처리(LengthEnforcer)
        |
        v
  DigestRepository.save(DailyDigest)
        |
        v
  NotificationPort.notifyDailyDigest(digest)  -- 채널: "daily_digest"
```

### 3-2. UI 표시 (포그라운드)

```
HomeScreen
   -> HomeViewModel.uiState : StateFlow<HomeUiState>
   -> ObserveDigestsUseCase()  // Flow<List<DailyDigest>>
   -> DigestRepositoryImpl.observeAll()  // Room Flow

DigestDetailScreen(digestId)
   -> DetailViewModel
   -> GetDigestByIdUseCase
   -> 원문 링크는 Custom Tabs(`androidx.browser`)로 열기
```

---

## 4. 의존성 다이어그램 (ASCII)

```
                    +-------------------+
                    |   HomeViewModel   |
                    +---------+---------+
                              |
              +---------------+----------------+
              |                                |
              v                                v
+---------------------------+    +----------------------------+
| ObserveDigestsUseCase     |    | BuildDailyDigestUseCase    |
+-------------+-------------+    +--------------+-------------+
              |                                 |
              v                                 v
     +-----------------+              +-------------------+
     | DigestRepository|              | NewsRepository    |
     +--------+--------+              +---------+---------+
              |                                 |
              v                                 v
        +-----+-----+                +----------+----------+
        | Room DB   |                | BigKindsDataSource  |
        +-----------+                +----------+----------+
              ^                                 |
              |                                 v
              |                       +---------+----------+
              +-----------------------+ SummarizerPort     |
                                      +---------+----------+
                                                |
                                                v
                                      +---------+----------+
                                      | LlmDataSource (Q4) |
                                      +--------------------+
```

---

## 5. KST 시간 처리 정책

- **저장은 UTC**: 모든 타임스탬프(`Article.publishedAt`, `DailyDigest.windowStart/End`)는 `Instant`(UTC epoch millis)로 저장.
- **윈도 계산만 KST**: "전일 00:00 ~ 24:00"는 `ZoneId.of("Asia/Seoul")` 기준으로 `LocalDate.minus(1, DAYS)` → `atStartOfDay` → `+1d`로 산출.
- KST는 DST가 없으므로 `ZonedDateTime.toInstant()`만으로 단순 변환 가능(특이 케이스 없음). 단위 테스트로 보장.
- 사용자에게 보여주는 표시는 `ZonedDateTime`로 KST 포맷팅.

---

## 6. 영속성 스키마(초안)

- `articles(id PK, source_id, title, url, body_snippet, published_at_utc, category, fetched_at_utc)`
- `summaries(article_id FK, summary_text, char_count, model, created_at_utc)`
- `digests(id PK, window_start_utc, window_end_utc, headline, body_100, created_at_utc)`
- `digest_articles(digest_id FK, article_id FK, order_index)` — 다이제스트가 인용한 원문 목록.

인덱스: `articles(published_at_utc)`, `digests(window_start_utc)`.

---

## 7. 위협 모델 초안

| 자산 | 위협 | 대응 |
| --- | --- | --- |
| LLM API 키 | 클라이언트 디컴파일·트래픽 스니핑으로 키 추출 | 우선순위 1: **백엔드 프록시**(Q4 결과 (a) 선택 시) → 키는 클라이언트에 미존재. (b) 온디바이스 선택 시: 빌드 시 BuildConfig 주입 + 네트워크 보안 설정 + 키 회전 정책 권고, but 보안상 비권장. `security-compliance` 검토 필요. |
| 빅카인즈 응답 | TLS downgrade, MITM | `usesCleartextTraffic=false`, OkHttp `ConnectionSpec.MODERN_TLS`, 핀닝은 인증서 회전 부담으로 옵션 처리. |
| 알림 권한 남용 | OS-13+ 거부 시 무알림 상태에서 사용자 혼란 | 첫 진입 시 권한 안내 화면, 거부 시 인앱 배너로 상태 알림. |
| 사용자 데이터 | 개인정보 수집(현재 가정: 없음) | 분석 SDK 미도입. 도입 시 Q8에 명시 후 동의 플로우 추가. |
| 백그라운드 작업 신뢰성 | OEM Doze/배터리 최적화로 지연 | `setExpedited`/`setExactAndAllowWhileIdle` 검토, 사용자에게 배터리 최적화 예외 안내(설치 후 1회). |

---

## 8. 외부 의존성 (분기 항목)

| 영역 | 후보 A | 후보 B | 결정 근거 |
| --- | --- | --- | --- |
| 뉴스 수집 | 빅카인즈 Open API | HTML 스크래핑 | Q1/Q2(researcher) |
| 알림 트리거 | 백엔드 cron + FCM | 단말 WorkManager + 로컬 알림 | Q3(researcher) |
| 요약기 호출 위치 | 백엔드 프록시 | 온디바이스 직접 호출 | Q4(researcher → security-compliance) |
| LLM 공급자 | OpenAI / Anthropic / Google | 한국어 특화(예: HyperCLOVA X) | Q9(신규, planner 후속) |

researcher 결과 수신 후 본 문서 §3, §7, §8을 갱신한다.

**Q6 잠정 정의(planner)**: "100자 내외" = 공백 포함 한글 코드포인트 기준 **80~120자**, 줄바꿈 제거, 키워드 중심 문체. 단일 함수 `SummaryLengthEnforcer`로 캡슐화하여 변경 시 한 곳만 수정.

**추가 결정 사항(`docs/open-questions.md` Q9~Q12)**: LLM 공급자 선택, 알림 본문 정책, 다이제스트 보관 기간, 본문 짧을 시 외부 크롤링 허용 여부.

---

## 9. 비기능 보장

- **정시성**: KST 07:00 ± 5분. WorkManager 단독 사용 시 OEM별 편차 대비 알람 폴백 검토.
- **오프라인**: `DigestRepository.observeAll()`이 Room을 단일 진실 소스로 노출 → 네트워크 무관하게 최신 캐시 표시.
- **접근성**: Compose `Text` 폰트 스케일 따름, 색 대비 WCAG AA 목표.
- **로깅**: 디버그 빌드에서만 OkHttp `HttpLoggingInterceptor.Level.BODY`, 릴리스는 `NONE`.
