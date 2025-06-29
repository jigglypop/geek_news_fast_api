# GeekNews 아키텍처 & 코드 품질 규칙

## 레이어 분리 원칙

### Layer 1 (Core - 핵심 로직)
- `config.py`: 모든 설정값 중앙 집중 관리
- `generator.py`: 뉴스 크롤링, AI 요약, 이미지 생성 로직
- **역할**: 비즈니스 로직, 외부 의존성 없는 순수 함수들

### Layer 2 (API - 서비스 계층)
- `server.py`: FastAPI 엔드포인트, 스케줄러 관리
- **역할**: HTTP 요청 처리, 작업 스케줄링, 상태 관리

### Layer 3 (Presentation - 표현 계층)
- `templates/`: HTML/CSS 템플릿, 디자인 요소
- **역할**: 사용자 인터페이스, 시각적 표현

**중요**: 상위 레이어가 하위 레이어에 침범하지 않도록 유지

## 파일 구조 및 책임 분리

### 핵심 원칙
- **Single Responsibility**: 한 파일은 한 가지 책임만
- **의존성 방향**: Layer 3 → Layer 2 → Layer 1 (단방향)
- **새 파일 생성 최소화**: 기존 파일 확장 우선

### 파일별 책임
```
config.py          → 설정값만 (PATH, CRAWLING, OUTPUT, COLOR, FONT, TEXT)
generator.py       → 뉴스 처리 로직만 (크롤링, 요약, 이미지 생성)
server.py          → API 서빙만 (엔드포인트, 스케줄러)
templates/         → 템플릿만 (HTML 구조, CSS 스타일)
```

## 코드 품질 규칙

### 네이밍 컨벤션
- **CSS 클래스**: kebab-case (`news-title`, `cover-container`)
- **설정값**: UPPER_SNAKE_CASE (`COLOR_CONFIG`, `FONT_CONFIG`)
- **함수명**: snake_case (`generate_news`, `create_html`)
- **변수명**: snake_case (`news_items`, `image_path`)

### 코드 스타일
- 주석 작성하지 않음 (코드가 자명해야 함)
- 의미없는 빈 줄 삽입 금지
- 함수/클래스 간 구분용 빈 줄만 허용
- 이모지 사용 금지

### 기존 로직 보호
- **핵심 파이프라인 보호**: 크롤링 → 요약 → 템플릿 렌더링 → 이미지 생성
- **API 호환성 유지**: 기존 엔드포인트 스펙 변경 금지
- **설정값 기본값 유지**: 새 설정 추가 시 기존 동작 보장

## 에러 처리 및 로깅

### 예외 상황 대비
- 크롤링 실패 (네트워크 오류, 사이트 구조 변경)
- AI API 호출 실패 (토큰 한도, 서비스 장애)
- 파일 I/O 오류 (권한, 디스크 용량)
- S3 업로드 실패 (인증, 네트워크)

### 로깅 규칙
```python
print(f"[모듈명] 상태: 상세 정보")
print(f"[에러] 오류 내용: {error}")
print(f"[성공] 작업 완료: {result}")
```

## 비동기 처리 원칙

### async/await 패턴 준수
- HTTP 요청은 `httpx.AsyncClient` 사용
- 파일 I/O는 `asyncio.to_thread` 활용
- 여러 작업 병렬 처리는 `asyncio.gather` 사용

### 리소스 관리
- 임시 파일 자동 정리
- 메모리 사용량 모니터링
- 연결 풀 적절한 관리 