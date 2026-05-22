# Q15: 무조건 무료 LLM API 선정

**조사일**: 2026-05-22  
**조사자**: researcher 에이전트

---

## 1. 평가 기준 (우선순위 순)

1. **무조건 무료**: (a) 신용카드 등록 불필요, (b) 한도 초과 시 자동 과금 없이 거부됨, (c) 향후 무료 정책 폐지 가능성이 낮음. 무료 트라이얼·크레딧 만료형 탈락.
2. **상업용 앱 허용**: Google Play 배포 앱의 백엔드가 호출해도 약관상 문제 없어야 함.
3. **한국어 키워드 요약 품질**: 경제 뉴스 100자 한국어 요약 능력.
4. **운영 한도 적합성**: 일 ~10회 호출, 입력 합계 10k~20k 토큰/일, 출력 합계 1~3k 토큰/일.
5. **백엔드 호출 용이성**: Firebase Functions(Node.js 20) HTTPS 호출, 공식 SDK 또는 OpenAI 호환 API.

---

## 2. 후보별 평가 표

| 후보 | 카드 불필요 | 한도 초과 시 자동 과금 없음 | 상업용 허용 | 한국어 품질 | RPD / RPM / TPM (무료) | 판정 |
|---|---|---|---|---|---|---|
| **Gemini 2.5 Flash** (AI Studio) | O | O (429 반환) | O (단, EEA/UK/CH 사용자 제공 앱은 유료 필요) | 매우 우수 (공식 한국어 최적화) | 1,500 RPD / 10 RPM / 250k TPM | **1순위** |
| **Gemini 2.5 Flash-Lite** (AI Studio) | O | O (429 반환) | O (동일 EEA 제한) | 우수 (Flash 대비 소형) | 1,500 RPD / 15 RPM / 250k TPM | 대체 모델 |
| **Groq Cloud** (Llama 3.3 70B) | O | O (429 반환) | O (GroqCloud Services Agreement 적용; website 약관의 "비상업" 조항은 API에 미적용) | 보통 (한국어 공식 미지원 8개 언어만) | 1,000 RPD / 30 RPM / 6k TPM | **2순위** |
| **Cloudflare Workers AI** | O | O (10k Neurons 초과 시 거부; Paid 플랜 필요) | O (상업용 허용) | 보통~우수 (Llama 3.3/Qwen 등) | 10,000 Neurons/일 (≈500토큰 응답당 400~600 Neurons 소비) | 3순위 (한도 협소) |
| **OpenRouter 무료 모델** | O (기본 50 RPD; $10 입금 후 1,000 RPD) | O (거부) | 조건부 O (개별 모델 라이선스 확인 필요) | 다양 (모델별 상이) | 50 RPD / 20 RPM (카드 없을 때); 1,000 RPD ($10 입금 후) | 탈락 (가용성 불안정, 모델 무예고 변경) |
| **HuggingFace Inference API** | O | O | 불명확 | 다양 | 수백 req/hour (비공식, 문서화 미흡) | 탈락 (한도 비문서화, 신뢰성 낮음) |
| **Mistral La Plateforme** (Experiment tier) | O | O | 탈락: 약관상 실험·프로토타입 전용, 상업 프로덕션 불가 | 우수 | 1 RPS / 500k TPM / 1B tokens/월 | **탈락** (상업용 불가) |
| **Cohere Trial Key** | O | O | **탈락**: 명시적 "non-commercial only" | 좋음 | 1,000 req/월 | **탈락** (상업용 명시 불가) |

### 탈락 상세 사유

- **Mistral Experiment 티어**: 공식 문서에서 "evaluation and prototyping purposes" 한정 명시. 프로덕션·상업 프로젝트는 Scale 플랜(유료) 요구. (출처: Mistral AI Rate limits docs, Grizzly Peak Software 2026 리뷰)
- **Cohere Trial Key**: 공식 문서(docs.cohere.com/docs/rate-limits)에 "Trial keys are not permitted to be used for production or commercial purposes" 명시.
- **OpenRouter 무료 모델**: 모델 가용성이 주단위로 변동, 예고 없는 제거·한도 변경, 2026-02-17 외부 캐시 장애로 20% 요청 실패 등 안정성 이슈. 단독 백엔드 의존에 부적합.
- **HuggingFace Inference API 무료**: 한도가 공식 문서에 명확히 기재되어 있지 않고, 비공식 커뮤니티 정보에 의존. 상업용 여부도 불명확.

---

## 3. 1순위 / 2순위 결론

### 1순위: Google Gemini API (Gemini 2.5 Flash, AI Studio 무료 티어)

**이유**:
- Google AI Studio 무료 티어는 신용카드 등록 없이 사용 가능하며, 한도 초과 시 429 오류 반환(자동 과금 없음). (사실, 공식 확인)
- 상업용 앱의 백엔드 사용 허용. 단, 앱이 EEA/UK/CH 사용자에게 서비스하는 경우 유료 전환 필요하나, 본 앱은 한국 대상이므로 해당 없음. (사실, Google Gemini API Additional Terms 인용)
- Gemini 2.5 시리즈는 공식적으로 한국어 최적화를 포함("dedicated optimizations in data quality and evaluation for Korean language"). (사실, Google DeepMind Gemini 2.5 기술 보고서)
- 1,500 RPD / 10 RPM / 250k TPM: 일 10회 호출 패턴에 충분히 여유로움.
- Node.js용 `@google/generative-ai` SDK 공식 제공, HTTPS API도 사용 가능.

**주의사항**:
- 무료 티어에서는 입력·출력 데이터가 Google 제품 개선에 활용될 수 있으며, 인간 검토 가능성도 있음. 경제 뉴스 요약이므로 민감 개인정보는 아니나 인지 필요. (사실, Google Gemini API Additional Terms §4)
- 무료 한도는 변경될 수 있음. 실제로 2025년 12월 Google이 한도를 50~80% 삭감한 전례 있음. (추정·간접 정보: aifreeapi.com, TokenMix)
- 현재 최신 모델은 Gemini 2.5 Flash이며, Gemini 2.0 Flash는 2026-06-01 종료 예정이므로 2.5 Flash 사용 필요.

### 2순위: Groq Cloud (Llama 3.3 70B Versatile)

**이유**:
- 신용카드 없이 가입·사용 가능. (사실, Groq 공식 FAQ)
- GroqCloud Services Agreement가 웹사이트 약관("personal, non-commercial")과 별개로 적용되며, API 상업용 사용 허용. 웹사이트 "비상업" 조항은 groq.com 사이트 접근에만 적용됨. (추정: 검색 결과 종합; 공식 Services Agreement 직접 확인 실패)
- 1,000 RPD / 30 RPM, 단 TPM이 6,000으로 제한적. 입력 2k 토큰 호출 시 TPM이 병목 가능성 있음.
- OpenAI 호환 API 제공으로 Node.js 연동 용이.

**주의사항**:
- **한국어 공식 미지원**: Llama 3.3 70B의 공식 지원 언어는 영어·독어·불어·이탈리아어·포르투갈어·힌디어·스페인어·태국어 8개로, 한국어 미포함. (사실, Meta 공식 모델 카드) 실제로는 한국어 입출력이 가능하나 공식 보장 없고 품질이 가변적임.
- TPM 6,000 제한: 입력 약 2k 토큰 × 10회 = 20k 입력 토큰/일이지만, 분당 6,000 토큰 제한으로 인해 연속 호출 시 대기 필요. 07:00 KST 일괄 처리 패턴에서는 요청 간 간격을 두어야 함.
- Groq가 Nvidia에 인수(2026)되면서 서비스 방향 변경 가능성 있음. (추정·간접 정보)

### 3순위 (참고용): Cloudflare Workers AI

- 10,000 Neurons/일 무료, 카드 불필요, 상업용 허용.
- 단, 10,000 Neurons = 약 500~600 토큰 응답 16~20회에 해당. 입력 토큰이 길면 Neuron 소비가 급증하여 일 10회 × 입력 2k 토큰 패턴에서 여유가 충분하지 않을 수 있음.
- REST API만 제공(Workers 환경 외부에서 HTTP 직접 호출 가능하나, Firebase Functions에서 `fetch()` 기반 직접 구현 필요).
- 한도 안전성 우려로 1·2순위 대비 위험도 높음.

---

## 4. 1순위 상세: Gemini 2.5 Flash — API 호출 방식·환경 변수·시뮬레이션

### 4-1. 추천 모델

`gemini-2.5-flash-latest` (또는 `gemini-2.5-flash`)

- Gemini 2.0 Flash는 2026-06-01 종료 예정 → 반드시 2.5 사용.
- Flash-Lite도 무료 1,500 RPD/15 RPM으로 사용 가능하나, 요약 품질은 Flash가 우위.

### 4-2. API 호출 방식

Node.js 공식 SDK (`@google/generative-ai`) 사용:

```
npm install @google/generative-ai
```

REST HTTPS 직접 호출도 가능:
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=<API_KEY>
```

Firebase Functions에서 환경 변수로 API Key 주입:
```
firebase functions:secrets:set GEMINI_API_KEY
```
Functions 코드에서 `process.env.GEMINI_API_KEY` 또는 Secret Manager 참조.

### 4-3. 환경 변수

| 변수명 | 값 | 주의 |
|---|---|---|
| `GEMINI_API_KEY` | AI Studio에서 발급한 API Key | Secret Manager 또는 Functions 환경변수로 보관, 클라이언트 노출 금지 |
| `GEMINI_MODEL` | `gemini-2.5-flash-latest` | 모델 버전 변경 시 환경변수만 교체 |

### 4-4. 일일 호출량 시뮬레이션

운영 패턴: KST 07:00 1회 실행, ~10회 호출, 입력 합계 ~15k 토큰, 출력 합계 ~2k 토큰.

| 항목 | 수치 |
|---|---|
| 하루 호출 수 | ~10회 |
| 평균 입력 토큰/호출 | ~1,500~2,000 |
| 평균 출력 토큰/호출 | ~150~200 |
| 일 총 입력 토큰 | ~15,000~20,000 |
| 일 총 출력 토큰 | ~1,500~2,000 |
| RPD 소진율 | 10 / 1,500 = **0.7%** |
| RPM 소진율 | 피크: 10회를 1분 내 연속 호출 시 10 RPM (한도 10 RPM 도달; 순차 처리하면 안전) |
| TPM 소진율 | 피크: 20,000 토큰 / 분 = **8%** (250,000 TPM 한도 대비 여유) |

결론: RPD·TPM 모두 여유로움. RPM만 10 RPM 한도와 동일하므로 호출 간 6초 이상 딜레이를 두면 안전. 또는 순차 처리(await 직렬 실행)로 자연스럽게 해결됨.

---

## 5. 출처 목록

| 항목 | URL | 확인일 |
|---|---|---|
| Gemini API 무료 티어 한도 공식 | https://ai.google.dev/gemini-api/docs/rate-limits | 2026-05-22 (직접 접근 실패, 복수 2차 출처로 교차 확인) |
| Gemini API Additional Terms (데이터 활용 정책) | https://ai.google.dev/gemini-api/terms | 2026-05-22 (직접 접근 실패, 공식 인용 다수 2차 출처 확인) |
| Gemini 2.5 Flash 모델 정보 | https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-lite | 2026-05-22 |
| Gemini 무료 한도 변경 이력 (2025-12 삭감) | https://www.howtogeek.com/gemini-slashed-free-api-limits-what-to-use-instead/ | 2026-05-22 (2차 출처) |
| Gemini API 가격 공식 | https://ai.google.dev/gemini-api/docs/pricing | 2026-05-22 |
| Gemini 2.5 기술 보고서 (한국어 최적화) | https://storage.googleapis.com/deepmind-media/gemini/gemini_v2_5_report.pdf | 2026-05-22 |
| Gemini API EEA/UK 제한 | https://discuss.ai.google.dev/t/clarification-on-only-paid-services-for-eea-ch-uk/107860 | 2026-05-22 |
| Groq 무료 티어 한도 | https://console.groq.com/docs/rate-limits | 2026-05-22 (직접 접근 실패, 복수 2차 출처 교차 확인) |
| Groq Services Agreement | https://console.groq.com/docs/legal/services-agreement | 2026-05-22 (직접 접근 실패, 인용 가능 2차 출처 확인) |
| Groq Terms of Use (website) | https://groq.com/terms-of-use | 2026-05-22 (직접 접근 실패) |
| Groq 무료 티어 상세 리뷰 | https://www.grizzlypeaksoftware.com/articles/p/groq-api-free-tier-limits-in-2026-what-you-actually-get-uwysd6mb | 2026-05-22 |
| Llama 3.3 70B 지원 언어 (Meta 공식) | https://huggingface.co/meta-llama/Llama-3.3-70B-Instruct | 2026-05-22 |
| Cloudflare Workers AI 가격 공식 | https://developers.cloudflare.com/workers-ai/platform/pricing/ | 2026-05-22 (직접 접근 실패, 공식 changelog + 2차 출처 확인) |
| Cloudflare Workers AI 무료 티어 실제 한도 리뷰 | https://costbench.com/software/llm-api-providers/cloudflare-workers-ai/free-plan/ | 2026-05-22 |
| OpenRouter 무료 모델 목록 (2026-05) | https://openrouter.ai/collections/free-models | 2026-05-22 |
| OpenRouter 안정성 리뷰 | https://ofox.ai/blog/is-openrouter-reliable-honest-review-2026/ | 2026-05-22 |
| OpenRouter 무료 모델 변동성 분석 | https://www.datastudios.org/post/openrouter-free-models-zero-cost-access-limitations-and-practical-trade-offs-across-experimentati | 2026-05-22 |
| Mistral 무료 티어 상업용 제한 | https://docs.mistral.ai/deployment/ai-studio/tier | 2026-05-22 (직접 접근 실패, 2차 출처 확인) |
| Cohere Trial Key 상업용 금지 (공식) | https://docs.cohere.com/docs/rate-limits | 2026-05-22 |
| HuggingFace Inference API 한도 | https://huggingface.co/docs/hub/en/rate-limits | 2026-05-22 |

---

## 6. 대체 옵션 (LLM 없이 가는 경우)

TextRank, YAKE 등 추출 요약 알고리즘으로 키워드 추출 후 규칙 기반 조합도 이론상 가능하나, 경제 맥락 파악·자연스러운 한국어 합성에 한계. 이번 사양("100자 키워드 요약")은 LLM 품질 요구 수준이므로 추출 요약 대체는 비권장.

---

## 7. 잔여 불확실성

1. **Gemini 무료 한도 변동 리스크**: 2025-12에 50~80% 삭감 전례. Google이 다시 한도를 낮출 경우 대응 필요. 현재 1,500 RPD는 일 10회 패턴 대비 매우 여유롭지만, 향후 변경 모니터링 권장.
2. **Groq 상업용 약관 정확도**: GroqCloud Services Agreement 원문 직접 확인 실패. 복수 2차 출처에서 "website 약관의 비상업 조항은 API에 미적용"으로 해석하고 있으나, 공식 확인이 불완전함. Groq 지원팀에 명시적 확인을 받는 것이 이상적.
3. **Gemini 2.5 Flash 한도 수치 불일치**: 복수 출처에서 "1,500 RPD / 10 RPM"과 "250 RPD / 10 RPM"이 혼재. 최신(2026-04~05 기준) 출처는 1,500 RPD로 수렴하나, 공식 페이지 직접 접근 실패로 완전 사실 확인 불가.

---

## 8. 오케스트레이터 후속 액션

1. `planner`는 `docs/architecture.md`와 `docs/plan.md`의 LLM 섹션을 **Gemini 2.5 Flash (AI Studio 무료 키)** 기준으로 갱신하고, 모델명 `gemini-2.5-flash-latest`, 환경변수 `GEMINI_API_KEY`(Secret Manager), SDK `@google/generative-ai`를 명시할 것.
2. 2순위 폴백으로 **Groq Cloud (llama-3.3-70b-versatile)** 를 architecture.md에 기재하되, 한국어 미공식 지원 리스크와 TPM 6k 제한을 주석으로 남길 것.
3. `coder`가 Functions 구현 시 모델 이름과 API Key를 하드코딩하지 않고 환경변수로 분리하도록 계획에 반영할 것.
