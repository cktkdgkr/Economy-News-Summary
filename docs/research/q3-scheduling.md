# Q3 — KST 07:00 정시 알림 구현 방식 비교

## 핵심 결론

Android 14+에서는 `SCHEDULE_EXACT_ALARM`이 신규 앱에 기본 거부되고 `USE_EXACT_ALARM`은 알람·캘린더·타이머 등 핵심 기능 앱에만 허용되어 **뉴스 앱은 단말 정시 알람을 사용할 수 없다**. WorkManager 단독은 Doze/배터리 최적화 영향으로 ±수십 분 편차가 발생한다. **백엔드 cron + FCM high-priority 푸시가 ±수 분 정시성을 안정적으로 달성하는 유일한 경로**다.

## 근거

- WorkManager 정시성 한계: 최소 주기 15분, Doze 준수, "가능한 한 빨리" 실행이지 정시가 아니다.
  - 출처: https://developer.android.com/develop/background-work/services/alarms (확인일 2026-05-21).
- Android 14 변경: 신규 앱의 `SCHEDULE_EXACT_ALARM` 기본 거부.
  - 출처: https://developer.android.com/about/versions/14/changes/schedule-exact-alarms (확인일 2026-05-21).
- Google Play 정책: `USE_EXACT_ALARM`은 "core, user-facing functionality requires precisely-timed actions"인 알람/타이머/캘린더 앱에만 허용. 뉴스 앱은 허용 대상 아님.
  - 출처: https://support.google.com/googleplay/android-developer/answer/16558241 (확인일 2026-05-21).
- FCM high-priority 동작: Doze 상태에서도 기기를 깨워 즉시 전달을 시도. `onMessageReceived`에서 expedited WorkManager 작업 기동이 2025년 권장 패턴.
  - 출처: https://firebase.google.com/docs/cloud-messaging/android-message-priority (확인일 2026-05-21).

## 비교표

| 항목 | (a) 백엔드 cron + FCM | (b) WorkManager + 로컬 알림 |
| --- | --- | --- |
| 정시성 | ±1~2분 (FCM 서버 딜레이 변수) | ±수 분 ~ 수십 분 |
| Android 14+ 호환 | 문제 없음 | exact alarm 기본 거부 |
| Play 정책 | 문제 없음 | `USE_EXACT_ALARM` 뉴스 앱 불허 |
| 비용 | 백엔드 운영비(소규모: Firebase Functions 무료 티어로 가능) | 0 |
| 복잡도 | 백엔드 cron + FCM 송신 | 앱 내 Worker + BootReceiver |
| 오프라인 알림 | 기기 오프라인 시 FCM 큐 대기 | 로컬 알림 가능(콘텐츠는 별도 수집 필요) |

## 권장안

- **분기 A 채택**: 백엔드 cron + FCM high-priority. Firebase Cloud Functions(Scheduled) + FCM 송신. data message 수신 시 클라이언트가 expedited Worker를 기동해 수집·요약·알림 게시.
- 백엔드 운영이 불가하면 정시성 요구를 ±30분으로 완화하고 WorkManager(`setRequiresBatteryNotLow`/`setExpedited`)로 폴백. 단, KST 07:00 ±5분 사양은 충족 곤란 — **사양 변경 에스컬레이션** 필요.

## 잔여 불확실성

- OEM별(One UI, MIUI 등) FCM 전달 편차는 실기기 테스트로 측정 필요.
- Firebase 무료 티어 한도 변경 가능성.
- 백엔드 운영 주체(개인 Firebase 프로젝트 vs 별도 인프라).
