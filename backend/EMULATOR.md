# 로컬 에뮬레이터 사용법

Firebase Emulator Suite 를 사용하면 실제 GCP 프로젝트 없이 로컬에서 Functions 를 테스트할 수 있습니다.

---

## 사전 준비

```bash
# Firebase CLI 설치 (미설치 시)
npm install -g firebase-tools

# 의존성 설치 (backend/functions 에서)
cd functions
npm install
npm run build
cd ..
```

---

## Functions 에뮬레이터 시작

`backend/` 디렉토리에서 실행합니다.

```bash
firebase emulators:start --only functions
```

정상 시작 시 아래와 같은 출력이 나타납니다.

```
i  emulators: Starting emulators: functions
✔  functions: Using node@20 from host.
✔  functions[asia-northeast3-helloWorld]: http function initialized
   (http://127.0.0.1:5001/<project-id>/asia-northeast3/helloWorld).

┌─────────────────────────────────────────────────────────────┐
│ ✔  All emulators ready! It is now safe to connect your app. │
└─────────────────────────────────────────────────────────────┘
```

---

## helloWorld 엔드포인트 호출

에뮬레이터가 실행 중인 상태에서 새 터미널을 열어 아래 명령어를 실행합니다.

```bash
curl http://127.0.0.1:5001/<project-id>/asia-northeast3/helloWorld
```

`<project-id>` 부분은 `.firebaserc` 에 설정된 실제 프로젝트 ID 로 교체합니다.  
`.firebaserc` 가 placeholder(`<your-firebase-project-id>`) 인 경우에는 그 값을 그대로 사용하면 됩니다.

정상 응답:

```
hello from economy-news-summary
```

---

## 에뮬레이터 UI (선택)

모든 에뮬레이터와 함께 UI 를 열고 싶을 때:

```bash
firebase emulators:start --only functions --import=./emulator-data --export-on-exit
```

브라우저에서 [http://127.0.0.1:4000](http://127.0.0.1:4000) 접속.

---

## 로컬 시크릿 설정 (T-B07 이후)

시크릿이 도입되면 `.env.local` 파일을 `backend/functions/` 에 생성하고 에뮬레이터에 전달합니다.

```bash
# backend/functions/.env.local (git 무시 파일, 절대 커밋 금지)
NEWSDATA_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
```

에뮬레이터는 자동으로 `.env.local` 을 읽습니다.  
실제 키 형식은 `backend/functions/.env.local.example` 을 참조하십시오.

---

## 주의 사항

- 에뮬레이터를 종료하려면 `Ctrl+C` 를 누릅니다.
- `node_modules/` 및 `lib/` 는 `.gitignore` 로 추적에서 제외됩니다.
- 실제 Firestore / FCM 과 연결하려면 별도 에뮬레이터 포트 설정이 필요합니다 (T-B04 이후).

---

## 종단 시나리오 테스트

Functions + Firestore 에뮬레이터를 조합해 `buildDailyDigest` 파이프라인 전체를 로컬에서 검증하는 방법입니다.

### 1. 단위/통합 테스트로 빠른 종단 검증 (에뮬레이터 불필요)

외부 HTTP(NewsData, Gemini)와 Firestore 를 모두 jest mock 으로 대체하는 통합 테스트가 `backend/functions/tests/integration.test.ts` 에 있습니다.

```bash
cd backend/functions
npm test -- --testPathPattern="integration"
```

검증 시나리오:

| 케이스 | 입력 | 검증 항목 |
| --- | --- | --- |
| 정상 종단 | 기사 3건 mock | `dateKst`, `headline` 길이 80~120, `items` 3건, 페이로드 4KB 이하 |
| 빈 기사 | 0건 mock | `headline = "수집된 뉴스가 없습니다"`, `items = []`, 페이로드 4KB 이하 |
| 대용량 | 기사 10건 + 긴 headline | `payload_overflow` 분기 정상 동작, 항상 4KB 이하 |

### 2. Functions + Firestore 에뮬레이터 조합 종단 시나리오

실제 Firestore 에뮬레이터에 데이터를 저장하는 흐름을 확인하려면 아래 절차를 따릅니다.

**사전 준비**

`backend/firebase.json` 에 `firestore` 에뮬레이터가 선언되어 있어야 합니다.

```json
{
  "emulators": {
    "functions": { "port": 5001 },
    "firestore": { "port": 8080 },
    "ui": { "enabled": true }
  }
}
```

**에뮬레이터 시작**

```bash
# backend/ 에서 실행
firebase emulators:start --only functions,firestore
```

**시간 강제 주입 + mock HTTP 종단 호출**

에뮬레이터가 실행 중일 때 Functions 는 `.env.local` 의 키를 읽습니다.
`NEWSDATA_API_KEY`, `GEMINI_API_KEY` 를 실제 값 또는 테스트용 더미 값으로 설정합니다.

```bash
# backend/functions/.env.local
NEWSDATA_API_KEY=test-newsdata-key
GEMINI_API_KEY=test-gemini-key
```

`scheduledDigest` HTTP 트리거(또는 직접 호출 가능한 래퍼 함수)가 있다면 아래처럼 호출합니다.

```bash
curl -X POST \
  "http://127.0.0.1:5001/<project-id>/asia-northeast3/scheduledDigest" \
  -H "Content-Type: application/json" \
  -d '{"nowUtc": "2026-05-23T22:00:00Z"}'
```

**결과 확인**

Firestore 에뮬레이터 UI(`http://127.0.0.1:4000/firestore`)에서 `digests/2026-05-23` 문서가 생성됐는지 확인합니다.

기대 문서 구조:

```json
{
  "dateKst": "2026-05-23",
  "headline": "<80~120자 요약>",
  "items": [...],
  "windowStart": "2026-05-22T15:00:00.000Z",
  "windowEnd": "2026-05-23T15:00:00.000Z",
  "articleCount": <n>,
  "createdAt": "<Timestamp>",
  "expiresAt": "<Timestamp, createdAt+90일>"
}
```

**검증 체크리스트**

- [ ] `digests/<dateKst>` 문서 생성 확인.
- [ ] `headline` 길이 80~120자.
- [ ] `expiresAt` = `createdAt` + 90일.
- [ ] FCM 페이로드 빌드: `buildFcmPayload(digest)` 결과 4KB 이하.
