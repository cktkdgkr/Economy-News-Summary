# Economy News Summary

매일 KST 07:00에 푸시 알림으로, 지난 하루의 글로벌 + 대한민국 핵심 경제 뉴스를 100자 내외 키워드 위주로 요약해 전달하는 안드로이드 앱.

> 현 단계: **다중 에이전트 Harness 구성 완료**. 앱 코드는 아직 시작되지 않았다.

---

## 1. 저장소 구조

```
.
├── CLAUDE.md                 # 오케스트레이터 운영 규칙
├── README.md                 # (이 파일) Harness 사용법
├── .claude/
│   └── agents/               # 서브에이전트 정의
│       ├── planner.md
│       ├── researcher.md
│       ├── coder.md
│       ├── code-reviewer.md
│       ├── test-engineer.md
│       ├── security-compliance.md
│       └── release-engineer.md
└── docs/
    ├── project-spec.md       # 앱 사양
    ├── open-questions.md     # 미해결 결정사항
    ├── progress.md           # 진행 상태 원장
    └── research/             # researcher 산출물
```

## 2. Harness 개념

- **오케스트레이터** = Claude Code 메인 세션. `CLAUDE.md`의 규칙에 따라 작업을 분해하고 서브에이전트에 위임한다.
- **서브에이전트** = `.claude/agents/`의 Markdown 파일. 각 파일의 YAML frontmatter(`name`, `description`, `tools`, `model`)와 본문(시스템 프롬프트)로 정의된다.
- 서브에이전트끼리 직접 통신하지 않는다. 오케스트레이터가 단계 간 컨텍스트를 명시적으로 전달한다.

## 3. 에이전트 요약

| 에이전트 | 한줄 역할 |
| --- | --- |
| `planner` | 작업을 분해하고 아키텍처·완료 기준을 수립한다. |
| `researcher` | 외부 API/약관/기술 선택지의 사실관계를 검증한다. |
| `coder` | 단일 작업 단위를 코드로 구현한다. |
| `code-reviewer` | 변경을 검증해 PASS/FAIL을 판정한다. |
| `test-engineer` | 핵심 시나리오 테스트를 작성·실행한다. |
| `security-compliance` | 보안·정책·약관 준수를 검토한다. |
| `release-engineer` | 빌드·서명·AAB·CI를 구성한다. |

## 4. 표준 워크플로우

1. `planner` 호출 + `researcher` 병행 → `docs/plan.md`, `docs/architecture.md`, `docs/research/*`.
2. 사용자에게 결과 확인 → 승인 후 코딩 진입.
3. 작업 단위별로 `coder` → `code-reviewer` 반복(PASS 전까지).
4. `test-engineer`로 테스트 작성·실행, 실패 시 `coder` 회귀 수정.
5. `security-compliance` 검토(차단 항목 0건이 될 때까지).
6. `release-engineer`로 빌드·배포 준비.

## 5. 에이전트 호출 예시

오케스트레이터(메인 세션)에서 서브에이전트는 `Agent` 도구의 `subagent_type` 인자로 호출한다. 일반적인 호출 의도 예시:

- **계획 수립**: "planner로 `docs/project-spec.md`와 `docs/open-questions.md`를 입력 삼아 `docs/plan.md`를 작성해줘."
- **자료 조사**: "researcher로 `docs/open-questions.md`의 Q1, Q2를 조사해 `docs/research/`에 결과를 남기고 표를 RESOLVED로 갱신해줘."
- **구현**: "coder로 `docs/plan.md`의 작업 단위 T-04(뉴스 수집 모듈)를 구현해줘. 완료 기준은 해당 섹션 참조."
- **검증**: "code-reviewer로 직전 coder 변경(파일 목록: …)을 검증해줘. PASS/FAIL 판정 + 지적사항."
- **테스트**: "test-engineer로 요약기의 100자 길이 제약과 KST 윈도 계산 테스트를 추가·실행해줘."
- **보안 검토**: "security-compliance로 릴리스 후보를 점검해줘. 차단 사유 + 비차단 권고 분리해서 보고."
- **배포 준비**: "release-engineer로 릴리스 AAB 빌드와 GitHub Actions 워크플로를 구성해줘."

## 6. 다음 단계

`docs/progress.md`의 M1(외부 의존성 조사) + M2(계획 수립)부터 진행한다. 사용자 지시로 `planner`/`researcher` 호출을 시작한다.
