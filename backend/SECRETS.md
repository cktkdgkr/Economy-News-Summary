# 시크릿 관리 가이드

## 필요한 시크릿

| 시크릿 이름 | 용도 | 발급처 |
|---|---|---|
| NEWSDATA_API_KEY | NewsData.io 뉴스 수집 API 키 | https://newsdata.io/register |
| GEMINI_API_KEY | Google Gemini AI 요약 API 키 | https://aistudio.google.com/apikey |

## 프로덕션 환경 (Google Cloud Secret Manager)

Firebase Functions v2는 Google Cloud Secret Manager를 사용합니다.

### 최초 등록

```bash
# Firebase CLI 설치 후
firebase functions:secrets:set NEWSDATA_API_KEY
firebase functions:secrets:set GEMINI_API_KEY
```

### 키 회전

```bash
# 새 키 등록 (기존 버전 유지)
firebase functions:secrets:set NEWSDATA_API_KEY
# 배포 후 이전 버전 정리
firebase functions:secrets:destroy NEWSDATA_API_KEY --version <이전버전>
```

### 확인

```bash
firebase functions:secrets:access NEWSDATA_API_KEY
firebase functions:secrets:access GEMINI_API_KEY
```

## 로컬 개발 환경 (에뮬레이터)

1. `backend/.env.local.example`을 `backend/.env.local`로 복사.
2. 실제 API 키를 입력.
3. 에뮬레이터 실행 시 자동으로 로드됩니다.

주의: `.env.local` 파일은 절대 git에 커밋하지 마세요.
