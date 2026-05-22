# Q13 — 네이버 뉴스를 빅카인즈 대체 소스로 사용 가능한가?

> 참고: 본 문서는 법적 자문이 아닌 보수적 권고다. 약관·정책 해석은 최종적으로 네이버 및 각 서비스의 공식 채널을 통해 확인해야 한다.

---

## 핵심 결론

네이버 검색 Open API(뉴스 엔드포인트)는 **심사 없이 즉시 발급**되며 기술적으로 상업 앱에 통합 가능하다. 단, 네이버 AI·Naver API 서비스 이용약관에 "결과 데이터의 무단 복제·저장·가공·배포 및 제3자 제공 금지" 조항이 명시되어 있어, **Google Play 배포 상업 앱에서 뉴스 요약 콘텐츠를 재가공·전달하는 사용 패턴이 이 약관에 저촉될 가능성이 있다.** 공식 경로(개발자센터)를 통한 약관 원문 확인 및 필요 시 네이버에 직접 문의가 선행되어야 한다. 약관 불확실성이 해소되지 않을 경우 NewsData.io 유료 플랜이 차선책으로 권장된다.

---

## 1. 네이버 검색 Open API — 뉴스 엔드포인트

### 1-1. 키 발급 절차

- 네이버 아이디로 로그인 후 개발자센터(https://developers.naver.com)에서 **애플리케이션 등록** → 클라이언트 ID·Secret 즉시 발급.
- **심사 없음.** 비로그인 오픈 API(검색, 기계번역, 단축 URL 등)는 등록 즉시 사용 가능.
- 출처: 네이버 개발자센터 애플리케이션 등록 안내(검색 결과 인용, 확인일 2026-05-22); 바티 사용가이드 https://guide.bati.ai/service/api/naverapi (직접 열람 실패, 검색 결과 발췌).

### 1-2. 쿼터 및 QPS

| 항목 | 수치 |
| --- | --- |
| 일일 호출 한도 | **25,000건/일** (애플리케이션 단위) |
| 건당 최대 반환 | 100건 |
| 시작 위치 최대값 (start) | 1,000 (실질 최대 접근 기사 수 ≈ 4,000~100,000건 논쟁 있음) |
| QPS(초당 요청) | 비공식 추정 10건/초 (429 오류 실사례 기반) |

- 출처: 검색 결과 복수 블로그 및 커뮤니티(Dataholic 포스트, 429 오류 해결기 등, 확인일 2026-05-22).
- **주의:** 일일 25,000건 한도는 공식 문서 직접 인용 불가 — 네이버 개발자센터 콘솔에서 실제 확인 필요.

### 1-3. 응답 필드

| 필드 | 설명 |
| --- | --- |
| `title` | 기사 제목 (HTML 태그 `<b>`, `</b>` 포함) |
| `description` | 기사 내용 요약 (길이 공식 명세 없음, HTML 태그 포함, 실제 수십~수백 자 추정) |
| `link` | 네이버 뉴스 URL (네이버에 서비스되는 경우) |
| `originallink` | 언론사 원본 URL |
| `pubDate` | 기사 게시일시 |

- **`description` 길이:** 공식 명세에 글자 수 제한이 명시된 문서를 직접 확인하지 못함. 실사례 기반 블로그에서 "검색 결과 문서의 내용을 요약한 정보"라고만 표현. **확인 실패** — 직접 API 테스트 후 확인 권장.
- **원문 본문 풀텍스트:** 제공하지 않음. description만 제공. 원문은 `originallink`로 연결.
- 출처: GitHub Ohmry/naver-api-search-news 레포 설명(확인일 2026-05-22); 검색 API Swagger 문서(naver/naver-openapi-guide, 확인일 2026-05-22).

### 1-4. 검색 파라미터

| 파라미터 | 설명 |
| --- | --- |
| `query` | 검색어 (UTF-8 인코딩) |
| `display` | 반환 건수 (1~100, 기본 10) |
| `start` | 시작 위치 (1~1000) |
| `sort` | `sim`(유사도순) / `date`(날짜순) |

- **기간 필터:** 공식 API에 기간 필터 파라미터 없음. `sort=date` + 수집 후 `pubDate` 기준 클라이언트 측 필터링으로 대응.
- **카테고리 필터(경제):** **없음.** 경제 카테고리 직접 지정 파라미터는 제공하지 않음.

### 1-5. 이용약관 및 상업적 이용 가능 여부

**[경고] 약관 원문 직접 열람 실패.** 다음 내용은 간접 확인된 사항이다.

- **결과 데이터 가공·배포 금지 조항 존재 확인:** 네이버 AI·Naver API 서비스 이용약관(네이버 클라우드 플랫폼 버전)에 다음 조항이 간접 확인됨.
  - "고객은 회사의 사전 동의 없이 본 서비스의 결과 데이터를 본 약관에서 허용한 범위를 넘어서서 무단으로 복제, 저장, 가공, 배포하거나 제3자에게 제공해서는 안됩니다."
  - Maps API 관련: "모든 API의 결과 데이터는 값을 리턴받는 즉시 사용하는 것만 허용되며, 별도로 저장해서는 안된다."
  - 출처: 검색 결과 발췌 (URL: `https://xv-ncloud.pstatic.net/images/provision/AI%C2%B7NaverAPI%EC%84%9C%EB%B9%84%EC%8A%A4%EC%9D%B4%EC%9A%A9%EC%95%BD%EA%B4%80_1620716044568.pdf`, 직접 열람 403 — 확인일 2026-05-22).
- **상업적 이용 명시적 허용 여부:** **확인 실패.** 개발자센터 검색 API 전용 이용약관에서 상업적 이용 허용/금지를 직접 명시한 조항은 공개된 자료에서 발견하지 못함.
- **적용 범위 불명확성:** 네이버 클라우드 플랫폼(AI·Naver API)의 약관과 개발자센터(developers.naver.com) 검색 API 약관이 동일한지 별도인지 **미확인**.
- **위험 평가:** 뉴스 API로 수집한 기사 title + description을 LLM으로 요약해 앱 사용자에게 알림으로 전달하는 패턴은 "결과 데이터의 가공·제3자 제공"에 해당할 가능성이 있음. 보수적으로 볼 때 **약관 저촉 리스크 있음**.

---

## 2. 경제 카테고리 필터 대안

API에 카테고리 파라미터가 없으므로, 다음 방식으로 우회한다.

### 방법 A — 복수 경제 키워드 순차 쿼리
- "경제", "증시", "환율", "금리", "물가", "GDP", "기업실적", "코스피", "원달러" 등 5~10개 키워드를 각각 `sort=date`로 호출.
- 일일 25,000건 한도 내에서 충분 (키워드당 1회 × 10건 = 10~100건/일).
- 단점: 키워드 누락 경제 뉴스 놓칠 수 있음. 일반 뉴스와 혼입 가능.

### 방법 B — 언론사 필터링 후처리
- 수집된 결과의 `originallink` 도메인을 기준으로 경제 전문지(hankyung.com, mk.co.kr, etoday.co.kr, edaily.co.kr, fnews.com 등) 발행 기사만 선별.
- 단점: URL 패턴 관리 필요. 도메인 변경 시 업데이트 필요.

### 방법 C — 언론사 자체 RSS 직접 활용 (네이버 API 우회)
- 한국경제(hankyung.com/feed), 이투데이(etoday.co.kr/rss) 등 경제지 RSS 피드 직접 수집.
- 단점: 언론사별 RSS 약관 확인 필요. 각 언론사 이용약관에서 상업적 사용 시 저작권자 허락 필요 조항 가능성 높음.

### 네이버 뉴스 경제 섹션 RSS
- news.naver.com 경제 섹션 RSS URL은 공개 자료에서 확인되지 않음. **확인 실패.**

---

## 3. 네이버 뉴스 본문 크롤링 가능 여부 (보조)

### robots.txt
- `https://news.naver.com/robots.txt` 직접 열람 실패 (서버 응답 미수령).
- 간접 확인: 나무위키 등에 따르면 "네이버는 메인 페이지를 제외한 모든 서비스에서 크롤링을 금지"하고 있음.
- **보수적 판단:** 크롤링 금지로 간주.
  - 출처: 나무위키 robots.txt 문서(검색 결과 인용, 확인일 2026-05-22).

### 이용약관
- 네이버 뉴스 서비스 이용약관 직접 열람 실패.
- 대법원 2022. 5. 12. 선고 2021도1533 판례: 약관이나 기술적 조치로 크롤링 제한을 표시한 사이트를 우회 접근하면 정보통신망법상 침입죄 성립 가능.
  - 출처: https://file.scourt.go.kr/dcboard/1727143941701_111221.pdf (확인일 2026-05-22).

### 권장 기본값
**본문 크롤링 안 함, description + originallink만 사용.**
- 근거: (1) robots.txt 금지 추정, (2) 이용약관 결과 데이터 가공 금지 조항 간접 확인, (3) 법원 판례상 위반 시 정보통신망법 위반 리스크, (4) description만으로도 LLM 경제 뉴스 키워드 요약에 충분한 입력값 확보 가능성 있음(사전 실험 필요).

---

## 4. 대안 후보 간단 비교

### 4-1. 구글 뉴스 RSS (비공식)
- **약관:** Google 공식 이용약관에서 RSS 피드는 "개인, 비상업적 사용(personal, non-commercial use only)"으로 명시. **상업용 앱 사용 불가.**
- 출처: https://www.google.com/intl/en_us/terms_google_news.html (직접 열람 실패, 구글 서포트 포럼 커뮤니티 스레드 인용, 확인일 2026-05-22); Google Publisher Center Community thread (확인일 2026-05-22).

### 4-2. Bing News Search API
- **상태:** 2025년 8월 11일 **공식 종료(retirement).** 신규 키 발급 불가.
- 출처: https://learn.microsoft.com/en-us/lifecycle/announcements/bing-search-api-retirement (확인일 2026-05-22).
- **채택 불가.**

### 4-3. NewsAPI.org
- **무료 플랜:** 개발·테스트 전용, 상업 배포 시 유료 전환 필요.
- **유료 플랜:** 최저 $1,749/월(추정)부터 시작 — 본 프로젝트 규모에 부적합.
- **본문:** API에서 본문 풀텍스트 미제공 (description만, URL에서 직접 스크래핑 필요).
- **한국어 지원:** 지원하나 한국 경제 전문지 커버리지 불명확.
- 출처: https://newsapi.org/pricing, https://newsapi.org/terms (직접 열람 실패, 검색 결과 발췌, 확인일 2026-05-22).

### 4-4. NewsData.io
- **무료 플랜:** 200 크레딧/일 × 10기사/크레딧 = 최대 2,000기사/일. **상업적 이용 명시적 허용.** 단, 12시간 지연.
  - 경제 알림 앱의 매일 1회 수집 패턴에서 200크레딧/일은 충분.
- **유료 Basic 플랜:** $199.99/월 — 실시간 기사, 전체 본문(full content), 6개월 히스토리. 12시간 지연 해소.
- **카테고리 필터:** `business` 카테고리 직접 지원.
- **한국어 지원:** 언어 코드 `ko` 파라미터로 한국어 뉴스 필터 가능.
- **주의:** 무료 플랜의 12시간 지연으로 전일 KST 기준 뉴스 수집에는 실질 문제 없음. 단, KST 07:00 실행 시점에 전날 뉴스가 포함될 수 있음 (UTC 기준 확인 필요).
- 출처: https://newsdata.io/blog/pricing-plan-in-newsdata-io/, https://newsdata.io/blog/free-news-api-for-commercial-use/ (직접 열람 실패, 검색 결과 발췌, 확인일 2026-05-22).

### 4-5. Mediastack
- **무료 플랜:** 500 요청/월, **비상업용 전용.**
- **유료 Basic 플랜:** $19.99/월, 10,000 요청/월.
- **카테고리:** `business` 지원. 국가 코드 `kr` 지원.
- **한국 경제 전문지 커버리지:** 불명확(7,500+ 글로벌 소스 중 한국 경제지 포함 여부 미확인).
- 출처: https://mediastack.com/pricing (직접 열람 실패, 검색 결과 발췌, 확인일 2026-05-22).

### 4-6. GDELT 프로젝트
- **비용:** 완전 무료, 오픈 데이터.
- **상업적 이용:** 전체 데이터베이스 "100% free and open" — 상업 이용 가능한 것으로 추정. 명시적 허용 조항 직접 확인 실패.
- **한국어:** 65개 언어 기계 번역(영어로 변환) 제공. 원문 한국어 기사 검색 후 처리 방식 별도 확인 필요.
- **실시간성:** 15분마다 업데이트.
- **단점:** API 복잡도 높음, 기사 본문 미제공(제목·URL·메타데이터 중심), 한국 경제지 커버리지 직접 확인 필요.
- 출처: https://www.gdeltproject.org/ (검색 결과 발췌, 확인일 2026-05-22).

### 대안 비교표

| 항목 | 네이버 검색 API | NewsData.io 무료 | NewsData.io Basic | Mediastack Basic | GDELT |
| --- | --- | --- | --- | --- | --- |
| 상업용 명시 허용 | **불명확** | O | O | O(유료만) | 추정 O(미확인) |
| 경제 카테고리 | 키워드 대체 | business 파라미터 | business 파라미터 | business 파라미터 | 키워드 검색 |
| 한국어 뉴스 | O | O(ko 필터) | O(ko 필터) | O(kr 필터) | 번역본 |
| 기사 본문 | description만 | 요약만(무료) | 전체 본문 | 요약 | 메타데이터 중심 |
| 실시간성 | 즉시 | 12시간 지연 | 실시간 | 실시간 | 15분 |
| 비용/월 | 무료 | 무료 | $199.99 | $19.99 | 무료 |
| 약관 리스크 | 높음(불명확) | 낮음 | 낮음 | 낮음 | 낮음 |

---

## 권장 의사결정

### 단계 1 — 네이버 검색 API 약관 직접 확인 (최우선)

채택 결정 전 반드시 다음 중 하나를 수행해야 한다.

1. 네이버 개발자센터(developers.naver.com)에 직접 로그인해 검색 API 이용약관 원문 확인.
2. 또는 네이버 개발자 고객센터에 "Google Play 배포 상업 앱에서 뉴스 검색 결과를 LLM으로 요약해 푸시 알림으로 전달하는 사용 패턴이 이용약관에 위반되는지" 서면 문의.

### 단계 2A — 약관 확인 후 허용 판정 시: 네이버 검색 API 채택

**사용 패턴:**
- 엔드포인트: `GET https://openapi.naver.com/v1/search/news.json`
- 쿼리: `경제`, `증시`, `환율`, `금리`, `물가` 등 복수 키워드를 각각 `sort=date`로 호출, `display=100`.
- 수집 범위: `pubDate` 기준 전일 KST 00:00~23:59 필터링.
- 카테고리 필터링: `originallink` 도메인이 경제 전문지에 해당하면 우선 처리 또는, 수집 전체를 LLM에 입력해 경제 관련 기사 추려내는 2단계 방식.
- 본문: `description` 필드 + `title`만 사용. 원문 크롤링 안 함.
- 하루 1회 실행, 5개 키워드 × 100건 = 500 호출/일 → 25,000 한도의 2% 미만.

### 단계 2B — 약관 확인 결과 불허 또는 미응답 시: NewsData.io 채택

**차선책 1순위: NewsData.io**
- 이유: 무료 플랜에서 상업용 명시 허용, 한국어(`ko`) + 비즈니스 카테고리(`business`) 직접 지원, 12시간 지연이지만 전일 뉴스 수집 패턴에는 실용적 문제 없음.
- 단, 무료 플랜에서 기사 본문(full content) 미제공 → description 수준에서 LLM 요약 수행. 품질 검증 필요.
- 실시간성이 필요하거나 전체 본문이 필요하면 Basic 플랜($199.99/월) 검토.
- 사용 패턴: `category=business&language=ko&country=kr` 파라미터로 하루 1회 호출. 200크레딧 충분.

---

## 잔여 불확실성

1. **네이버 검색 API 이용약관 원문:** 공개된 자료로 직접 확인 불가. 개발자센터 로그인 후 확인 또는 고객센터 문의 필수.
2. **네이버 뉴스 description 필드 실제 길이:** 공식 명세 없음. 직접 API 호출 테스트 필요.
3. **네이버 뉴스 경제 섹션 RSS URL:** 공개 자료에서 확인되지 않음.
4. **NewsData.io 무료 플랜 12시간 지연 기준:** UTC vs KST 기준 정확한 수집 범위 실험 필요.
5. **언론사 RSS 상업 이용 조건:** 각 언론사별로 저작권자 허락 요구 여부 상이함. 별도 협의 필요.

---

## 출처 목록

- 네이버 개발자센터 애플리케이션 등록 안내: https://naver.github.io/naver-openapi-guide/appregister.html (확인일 2026-05-22, 직접 열람 실패 — 검색 결과 발췌)
- 네이버 AI·Naver API 이용약관 PDF: https://xv-ncloud.pstatic.net/images/provision/AI%C2%B7NaverAPI%EC%84%9C%EB%B9%84%EC%8A%A4%EC%9D%B4%EC%9A%A9%EC%95%BD%EA%B4%80_1620716044568.pdf (직접 열람 실패, 검색 결과 발췌, 확인일 2026-05-22)
- GitHub naver/naver-openapi-guide Swagger YAML: https://github.com/naver/naver-openapi-guide/blob/master/ko/naver-openapi-swagger.yaml (확인일 2026-05-22)
- GitHub Ohmry/naver-api-search-news: https://github.com/Ohmry/naver-api-search-news (확인일 2026-05-22)
- 대법원 2022. 5. 12. 선고 2021도1533 판결문: https://file.scourt.go.kr/dcboard/1727143941701_111221.pdf (확인일 2026-05-22)
- Google 뉴스 이용약관 (RSS 비상업 조항): https://www.google.com/intl/en_us/terms_google_news.html (직접 열람 실패); Google Publisher Center 커뮤니티 스레드 https://support.google.com/news/publisher-center/thread/251773590 (확인일 2026-05-22)
- Bing Search API 종료 공지: https://learn.microsoft.com/en-us/lifecycle/announcements/bing-search-api-retirement (확인일 2026-05-22)
- NewsData.io 가격 정책: https://newsdata.io/blog/pricing-plan-in-newsdata-io/ (직접 열람 실패, 검색 결과 발췌, 확인일 2026-05-22)
- NewsData.io 상업용 무료 API 안내: https://newsdata.io/blog/free-news-api-for-commercial-use/ (직접 열람 실패, 검색 결과 발췌, 확인일 2026-05-22)
- Mediastack 가격 정책: https://mediastack.com/pricing (직접 열람 실패, 검색 결과 발췌, 확인일 2026-05-22)
- GDELT Project: https://www.gdeltproject.org/ (확인일 2026-05-22)
- 연합뉴스 RSS 상업 이용 안내: 연합뉴스경제TV RSS 인덱스 https://www.yonhapnewseconomytv.com/rssIndex.html; 한국언론진흥재단 디지털뉴스 이용규칙 https://www.kpf.or.kr/front/board/boardContentsView.do?board_id=291&contents_id=855b0c963b5c4a42ba6b26d06c7186d4 (직접 열람 실패, 검색 결과 발췌, 확인일 2026-05-22)
