# Q14 — 최소 비용 서버리스 백엔드 선택

## 질문

매일 KST 07:00(UTC 22:00)에 cron을 트리거해 뉴스 수집 → Anthropic Claude API 요약 → FCM 푸시 발송을 수행할 서버리스 백엔드로, 최소 비용(무료 한도 내 운영 목표) 옵션 중 무엇이 가장 적합한가?

부하 기준: 일 1회 cron, 사용자 100명, 글로벌 요약 1건, Anthropic API 1~3회, FCM 발송 1건(topic) 또는 100건.

---

## 핵심 결론

**1순위: Firebase Cloud Functions (2nd gen) + Cloud Scheduler + FCM**

Firebase Admin SDK로 FCM 발송을 네이티브로 처리할 수 있고, Cloud Scheduler가 타임존(Asia/Seoul)을 직접 지원하며, Blaze plan 무료 한도가 일 1회 cron 부하를 수년간 커버한다. Cloud Scheduler 1개 job은 월 $0(3개까지 무료)이며, Cloud Functions 실행 비용도 월간 무료 한도(200만 호출, CPU 20만 초)를 사실상 초과하지 않는다.

**2순위 백업: Cloudflare Workers + Cron Triggers**

완전 무료 플랜으로 cron을 지원하나, 프리 티어 CPU 한도(10ms/요청)가 뉴스 수집 + LLM 호출이 포함된 실제 작업 시간을 커버하지 못한다. 유료 플랜($5/월)으로 전환하면 CPU 30초 기본으로 충분하지만, FCM 푸시를 HTTP v1 API + 서비스 계정 JWT 직접 서명으로 구현해야 하는 복잡도가 있다.

---

## 근거

### 1. Firebase Cloud Functions (2nd gen) + Cloud Scheduler + FCM

#### 무료 한도 (Blaze pay-as-you-go plan, 매월 초기화)

| 항목 | 무료 한도 | 일 1회 cron 소비량 추정 |
|------|----------|----------------------|
| 호출 수 | 2,000,000회/월 | 30회/월 (무시 수준) |
| CPU-seconds | 200,000초/월 | <1초/일 |
| GB-seconds (메모리) | 400,000 GB-초/월 | <1 GB-초/일 |
| 아웃바운드 네트워크 | 5 GB/월 | KB 수준/일 |
| Cloud Scheduler job | **3개/계정/월 무료** | 1개 사용 |

- 출처: [Firebase Pricing](https://firebase.google.com/pricing) (검색 확인, 2026-05-22)
- 출처: [Cloud Scheduler Pricing](https://cloud.google.com/scheduler/pricing) (검색 확인, 2026-05-22)

주의: Cloud Functions 2nd gen은 **Blaze(종량제) 플랜 필수**. Spark(무료) 플랜에서는 Functions 배포 불가. 단, Blaze 플랜도 무료 한도 초과 전까지 과금 없음.

#### 월 예상 비용

- Cloud Scheduler: $0 (3개 무료 한도 내)
- Cloud Functions: $0 (무료 한도 내)
- FCM: $0 (발송 무제한 무료)
- Cloud Secret Manager: $0.06/10만 접근이나 일 1회 접근은 사실상 $0 수준
- **합계: $0/월 (현실적)**

#### FCM 발송

Firebase Admin SDK를 사용하면 `admin.messaging().send({ topic: 'economy-news', notification: {...} })` 한 줄로 topic 발송 가능. 서비스 계정 JWT 수동 서명 불필요. 네이티브 통합으로 FCM 발송 난이도 최저.

- 출처: [Send a message using Firebase Admin SDK](https://firebase.google.com/docs/cloud-messaging/send/admin-sdk) (검색 확인, 2026-05-22)

#### cron 신뢰성 및 타임존

Cloud Scheduler는 `cron` 표현식과 타임존(예: `Asia/Seoul`)을 직접 지원. KST 07:00를 `0 7 * * *`로 설정하고 timezone을 `Asia/Seoul`로 지정하면 정확히 작동.

- 출처: [Cron job format and time zone | Cloud Scheduler](https://docs.cloud.google.com/scheduler/docs/configuring/cron-job-schedules) (검색 확인, 2026-05-22)

#### 콜드 스타트 및 타임아웃

- 콜드 스타트: 경량 함수 1~3초, firebase-admin 포함 시 최대 12초
- 타임아웃: 기본 60초, 최대 3600초까지 설정 가능
- 뉴스 수집 + Anthropic API 호출 총 소요 예상: 10~30초 → 기본 타임아웃으로 충분, 안전 마진을 위해 180~300초 설정 권장
- 출처: [Comprehensive Analysis of Firebase Functions Cold Starts](https://www.javacodegeeks.com/2025/04/comprehensive-analysis-of-firebase-functions-cold-starts.html) (검색 확인, 2026-05-22)

#### 시크릿 보관

Cloud Secret Manager를 통해 Anthropic API 키, FCM 서비스 계정 JSON을 암호화 저장. `defineSecret()` API로 함수 내 접근. 표준 GCP 보안 체계 그대로 활용.

- 출처: [Configure your environment | Cloud Functions for Firebase](https://firebase.google.com/docs/functions/config-env) (검색 확인, 2026-05-22)

#### Android 클라이언트 통합

Firebase SDK(`google-services.json` + Firebase Messaging 의존성)가 이미 Android 프로젝트에 통합됨. FCM 토픽 구독(`FirebaseMessaging.getInstance().subscribeToTopic("economy-news")`) 추가만으로 완성. 추가 클라이언트 코드 최소.

---

### 2. Cloudflare Workers + Cron Triggers

#### 무료 한도

| 항목 | 무료 한도 | 일 1회 cron 적합 여부 |
|------|----------|----------------------|
| 요청 수 | 100,000요청/일 | 적합 (1회/일) |
| **CPU 시간** | **10ms/요청** | **부적합** — 뉴스 수집+LLM 수십 초 필요 |
| Cron Triggers | 5개/Worker (무료 포함) | 적합 |
| KV 읽기 | 100,000/일 | 적합 |
| KV 쓰기 | 1,000/일 | 적합 |
| KV 저장소 | 1 GB | 적합 |

중요: 무료 티어의 CPU 10ms 한도는 **I/O 대기 시간을 제외한 순수 CPU 시간** 측정. 그러나 뉴스 파싱, JSON 직렬화 등 CPU 작업이 10ms를 초과할 가능성이 높다. 유료 플랜($5/월)으로 전환하면 CPU 기본 30초, 최대 300초(5분)로 충분.

- 출처: [Pricing · Cloudflare Workers docs](https://developers.cloudflare.com/workers/platform/pricing/) (검색 확인, 2026-05-22)
- 출처: [Limits · Cloudflare Workers docs](https://developers.cloudflare.com/workers/platform/limits/) (검색 확인, 2026-05-22)

#### 월 예상 비용

- 무료 플랜: $0/월 (단, CPU 한도로 실제 작동 불가능 가능성 높음)
- 유료 플랜: $5/월

#### FCM 발송 난이도

Cloudflare Workers에서 FCM을 호출하려면 FCM HTTP v1 API를 직접 구현해야 함. 절차:
1. Google 서비스 계정 JSON 파일 보유
2. 매 발송 전 서비스 계정 키로 JWT 서명하여 OAuth2 액세스 토큰 발급
3. `POST https://fcm.googleapis.com/v1/projects/{PROJECT_ID}/messages:send` 직접 호출

Workers 환경에서 RSA-SHA256 JWT 서명을 Web Crypto API로 구현해야 하므로, Firebase Admin SDK 사용 대비 구현 복잡도 중간~높음.

- 출처: [Send a message using FCM HTTP v1 API](https://firebase.google.com/docs/cloud-messaging/send/v1-api) (검색 확인, 2026-05-22)

#### cron 신뢰성 및 타임존

- Cron Triggers는 **UTC 기준 전용**. KST 07:00 = UTC 22:00 → `0 22 * * *` 설정 필요 (하드코딩, 가독성 낮음)
- 실행 시각 정밀도: 지정된 분 내 실행되나 초 단위 보장 없음 (±30초 분산 가능)
- 출처: [Cron Triggers · Cloudflare Workers docs](https://developers.cloudflare.com/workers/configuration/cron-triggers/) (검색 확인, 2026-05-22)

#### 시크릿 보관

`wrangler secret put` 명령으로 암호화 저장. Workers 실행 시 `env.SECRET_NAME`으로 접근. Cloudflare Secrets Store (Beta)로 계정 수준 공유도 가능.

- 출처: [Secrets · Cloudflare Workers docs](https://developers.cloudflare.com/workers/configuration/secrets/) (검색 확인, 2026-05-22)

---

### 3. Vercel Functions + Cron

#### 핵심 제약 — 상업용 사용 금지 (Hobby 플랜)

Vercel Hobby 플랜은 **개인 비상업적 용도 전용**으로 명시. Play 스토어 배포 앱의 백엔드로 사용 시 약관 위반 가능성. 상업용으로 Pro 플랜($20/월~) 필요.

- 출처: [Vercel Hobby Plan](https://vercel.com/docs/plans/hobby) (검색 확인, 2026-05-22)

#### cron 한도 (Hobby)

Hobby 플랜은 **일 1회 이하**로 cron 빈도 제한. 분 단위 설정 불가.

#### 실행 타임아웃

Hobby 기본 10~60초. Fluid Compute 사용 시 최대 300초.

#### 월 예상 비용

- Hobby: $0 (단, 상업용 금지)
- Pro: $20/월~

**결론: 상업용 제약으로 인해 Google Play 배포 앱에는 부적합.**

---

### 4. Supabase Edge Functions + pg_cron

#### 핵심 제약 — 7일 비활성 자동 일시정지

무료 티어는 DB에 7일간 쿼리가 없으면 프로젝트가 자동 일시정지됨. 매일 cron이 실행되면 이론상 활성 유지 가능하나, 정지된 프로젝트가 복구되기까지 수분 소요 → 정시성 리스크 존재. 운영 안정성이 요구되는 daily push 용도에는 리스크.

- 출처: [Supabase Free Tier Limits](https://aiagencyplus.com/supabase-free-tier-limits/) (검색 확인, 2026-05-22)

#### 무료 한도

| 항목 | 무료 한도 |
|------|----------|
| Edge Functions 호출 | 500,000회/월 |
| DB 스토리지 | 500 MB |
| 활성 프로젝트 | 2개 |

#### 월 예상 비용

- 무료: $0 (자동 일시정지 리스크 감수 시)
- Pro: $25/월 (일시정지 없음)

#### FCM 발송

HTTP v1 API 직접 구현 필요 (Cloudflare와 동일 수준 복잡도).

#### cron 지원

pg_cron + pg_net 확장으로 Edge Function을 주기적으로 호출 가능. 타임존 설정은 pg_cron 설정에 따름.

---

### 5. Google Cloud Run + Cloud Scheduler (참고)

Cloud Functions 2nd gen이 내부적으로 Cloud Run 기반이므로, 직접 Cloud Run 서비스를 배포하는 경우와 비교.

#### 무료 한도 (Cloud Run)

| 항목 | 무료 한도 |
|------|----------|
| vCPU-seconds | 180,000/월 |
| GiB-seconds | 360,000/월 |
| 요청 수 | 2,000,000/월 |
| 아웃바운드 | 1 GiB/월 (북미) |

- 출처: [Google Cloud Run Pricing](https://cloudchipr.com/blog/cloud-run-pricing) (검색 확인, 2026-05-22)

#### Cloud Functions vs Cloud Run 직접 배포 차이

| 항목 | Cloud Functions 2nd gen | Cloud Run 직접 |
|------|------------------------|---------------|
| 설정 복잡도 | Firebase CLI로 간단 | Dockerfile + 배포 파이프라인 필요 |
| Firebase 통합 | 네이티브 | 수동 구성 |
| 콜드스타트 | 동일 (Cloud Run 기반) | 동일 |
| 비용 | 동일 | 동일 |

소규모 프로젝트에서는 Cloud Functions 사용이 Cloud Run 직접 배포보다 운영 간편성 우위.

---

## 비교 요약표

| 항목 | Firebase Functions + Cloud Scheduler | Cloudflare Workers (유료) | Cloudflare Workers (무료) | Vercel | Supabase |
|------|--------------------------------------|--------------------------|--------------------------|--------|----------|
| 월 비용 | **$0** (무료 한도 내) | $5/월 | $0 (CPU 한도 위험) | $0 Hobby (상업용 금지) / $20 Pro | $0 (정지 리스크) / $25 Pro |
| FCM 발송 | **Admin SDK 네이티브** | HTTP v1 직접 구현 | HTTP v1 직접 구현 | HTTP v1 직접 구현 | HTTP v1 직접 구현 |
| cron 타임존 | **Asia/Seoul 직접 지원** | UTC 고정 (KST 수동 계산) | UTC 고정 | 지원 | pg_cron 설정 의존 |
| cron 신뢰성 | **높음** (GCP SLA) | 중간 (±30초 분산) | 중간 | 중간 | 낮음 (일시정지 리스크) |
| Anthropic API 타임아웃 | 180~3600초 설정 가능 | 유료 30초 기본, 최대 300초 | **10ms CPU 한도 (부적합)** | 기본 10~60초, Fluid 300초 | Edge 제한 있음 |
| 시크릿 보관 | Cloud Secret Manager | Wrangler secrets | Wrangler secrets | Vercel env | Supabase vault |
| Android 통합 | **Firebase SDK 일원화** | HTTP API 별도 구현 | HTTP API 별도 구현 | HTTP API 별도 구현 | HTTP API 별도 구현 |
| 학습 비용 | 중간 (GCP 콘솔 익히기) | 낮음 (wrangler CLI) | 낮음 | **낮음** | 중간 |
| 상업용 적합 | **적합** | 적합 | 적합 | **Hobby 금지** | 적합 (리스크 있음) |

---

## 권장 의사결정

### 1순위: Firebase Cloud Functions (2nd gen) + Cloud Scheduler + FCM

**근거:**
- **비용**: Cloud Scheduler 1 job 무료(3개 한도 내), Cloud Functions 무료 한도(일 1회 cron 기준 수년간 초과 불가), FCM 무료 → **실질 월 $0**.
- **FCM 통합**: Admin SDK 한 줄 호출로 topic push 발송. 서비스 계정 JWT 직접 구현 불필요. Android 클라이언트도 Firebase SDK 이미 사용 예정이므로 일원화.
- **정시성**: Cloud Scheduler의 `Asia/Seoul` 타임존 직접 지원으로 KST 07:00 설정이 직관적이고 일광절약시간(한국 DST 없음) 오류 리스크 없음.
- **타임아웃**: 최대 3600초까지 설정 가능해 Anthropic API 지연에 안전.
- **시크릿**: Cloud Secret Manager로 Anthropic API 키, FCM 서비스 계정 키를 GCP 표준 보안 체계로 관리.

**주의사항**: Blaze(종량제) 플랜 활성화 필요. 신용카드 등록 및 예산 알림($1~5) 설정 권장.

### 2순위 백업: Cloudflare Workers (유료 $5/월)

- Firebase 생태계를 피하고 싶거나, 엣지 네트워크 글로벌 분산이 필요한 경우 선택.
- $5/월의 고정 비용이 발생하며, FCM HTTP v1 API를 Web Crypto API로 직접 구현해야 하는 추가 작업 필요.
- Cloudflare Workers 무료 플랜은 CPU 10ms 한도로 뉴스 수집 + 요약 작업에 부적합(사실상 사용 불가).

### 채택 후 확정 필요한 후속 결정

1. **FCM 발송 방식**: topic 1건 발송(`economy-news` 구독) vs 개별 토큰 N건 발송. 사용자 수 100명 규모에서는 topic 발송이 단순하고 확장성 있음. 단, 개인화 알림(사용자별 설정)이 필요하면 개별 토큰 발송으로 전환 필요.
2. **다이제스트 캐시 저장소**: Cloud Functions에서 생성한 요약 결과를 Cloud Firestore 또는 Cloud Storage에 저장할지, 앱 화면에서 최신 요약을 불러올 수 있는 API 엔드포인트를 Functions로 함께 제공할지 결정 필요.
3. **재시도 정책**: Cloud Scheduler의 재시도 설정(실패 시 최대 N회 재시도)과 Functions 내부 오류 처리 전략.
4. **런타임**: Node.js vs Python (Firebase Functions 2nd gen 지원). Node.js 권장(firebase-admin SDK 성숙도, npm 생태계).

---

## 잔여 불확실성

- Cloud Scheduler의 `Asia/Seoul` 타임존 지원은 공식 문서(`tz` 데이터베이스 기반)에서 확인됨. 실제 값은 `Asia/Seoul` 문자열로 설정하면 되며, 한국은 DST 없으므로 오차 리스크 없음.
- Cloudflare Workers 무료 플랜의 CPU 10ms 한도가 cron scheduled handler에도 동일하게 적용되는지 공식 문서에서 명시적으로 분리 설명하지 않음. 검색 결과 상충 정보(10ms vs 50ms) 있으므로, Cloudflare 선택 시 실측 필요.
- Firebase Blaze 플랜 전환 후 예기치 않은 과금이 발생하지 않도록 GCP 예산 알림 설정 필수 (공식 권장사항).

---

## 출처

- [Firebase Pricing](https://firebase.google.com/pricing) — 확인일 2026-05-22
- [Firebase Cloud Functions Quotas](https://firebase.google.com/docs/functions/quotas) — 확인일 2026-05-22
- [Cloud Scheduler Pricing](https://cloud.google.com/scheduler/pricing) — 확인일 2026-05-22
- [Cron job format and time zone | Cloud Scheduler](https://docs.cloud.google.com/scheduler/docs/configuring/cron-job-schedules) — 확인일 2026-05-22
- [Cloudflare Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/) — 확인일 2026-05-22
- [Cloudflare Workers Limits](https://developers.cloudflare.com/workers/platform/limits/) — 확인일 2026-05-22
- [Cron Triggers · Cloudflare Workers](https://developers.cloudflare.com/workers/configuration/cron-triggers/) — 확인일 2026-05-22
- [Cloudflare Workers KV Limits](https://developers.cloudflare.com/kv/platform/limits/) — 확인일 2026-05-22
- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/) — 확인일 2026-05-22
- [Vercel Hobby Plan](https://vercel.com/docs/plans/hobby) — 확인일 2026-05-22
- [Vercel Cron Jobs Usage and Pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing) — 확인일 2026-05-22
- [Supabase Pricing](https://supabase.com/pricing) — 확인일 2026-05-22
- [Supabase Edge Functions Limits](https://supabase.com/docs/guides/functions/limits) — 확인일 2026-05-22
- [Google Cloud Run Pricing](https://cloud.google.com/run/pricing) — 확인일 2026-05-22
- [Send a message using Firebase Admin SDK | FCM](https://firebase.google.com/docs/cloud-messaging/send/admin-sdk) — 확인일 2026-05-22
- [Configure your environment | Cloud Functions for Firebase](https://firebase.google.com/docs/functions/config-env) — 확인일 2026-05-22
- [Firebase Functions Cold Starts Analysis](https://www.javacodegeeks.com/2025/04/comprehensive-analysis-of-firebase-functions-cold-starts.html) — 확인일 2026-05-22

---

*이 문서는 공식 가격 문서 및 공식 기술 문서를 기반으로 작성되었습니다. 이용약관 해석은 법적 자문이 아니며 참고 목적으로만 제공됩니다. 가격 정보는 서비스 제공자가 변경할 수 있으므로 최신 공식 페이지를 재확인하세요.*
