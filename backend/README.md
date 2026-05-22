# Economy News Summary — Backend

Firebase Cloud Functions (Node.js 20 + TypeScript) 백엔드 코드.

---

## 디렉토리 구조

```
backend/
├── firebase.json        Firebase CLI 설정
├── .firebaserc          프로젝트 ID (placeholder → 실제 ID 교체 필요)
├── functions/           Functions 소스 코드
│   └── src/index.ts     함수 진입점 (helloWorld 포함)
├── README.md            (현재 파일)
└── EMULATOR.md          로컬 에뮬레이터 사용법
```

---

## 운영자 외부 콘솔 작업 절차

코드 배포 전에 GCP / Firebase 콘솔에서 직접 수행해야 합니다.

### 1. GCP / Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/) → **프로젝트 추가** 클릭.
2. 프로젝트 이름 입력 후 생성 완료.
3. 생성된 프로젝트 ID를 메모합니다 (예: `my-economy-news-12345`).

### 2. Blaze 플랜 전환

1. Firebase Console → 왼쪽 하단 **스파크 → 업그레이드** 클릭.
2. **Blaze(종량제)** 플랜 선택 후 결제 수단 등록.
3. Cloud Functions 2nd gen 은 Blaze 플랜에서만 배포 가능합니다.

### 3. 예산 알림 설정 ($1 ~ $5)

1. [GCP Console](https://console.cloud.google.com/) → **결제** → **예산 및 알림**.
2. **예산 만들기** → 프로젝트 선택 → 금액 $1 ~ $5 → 이메일 수신자 추가.

### 4. Firebase CLI 로그인 및 프로젝트 연결

```bash
npm install -g firebase-tools   # Firebase CLI 설치 (미설치 시)
firebase login                  # Google 계정 로그인
# backend/ 디렉토리에서 실행
firebase use <your-firebase-project-id>
```

`firebase use` 실행 후 `.firebaserc` 의 placeholder 가 실제 ID 로 갱신됩니다.

### 5. 필수 GCP API 활성화

[GCP Console API 라이브러리](https://console.cloud.google.com/apis/library)에서 활성화합니다.

| API | 용도 |
|---|---|
| Cloud Functions API | Functions 배포 |
| Cloud Build API | 빌드 실행 |
| Secret Manager API | API 키 보관 (T-B07) |
| Cloud Scheduler API | KST 07:00 정시 트리거 (T-B05) |

---

## 로컬 개발 및 빌드

```bash
cd backend/functions
npm install       # 의존성 설치
npm run build     # TypeScript 컴파일
npm run lint      # 린트 검사
```

---

## 배포

```bash
# backend/ 디렉토리에서 실행
firebase deploy --only functions
```

predeploy 훅(`lint` → `build`)이 자동으로 실행됩니다.

---

## 로컬 에뮬레이터

`EMULATOR.md` 를 참조하십시오.
