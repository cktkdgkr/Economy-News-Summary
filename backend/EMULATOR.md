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
