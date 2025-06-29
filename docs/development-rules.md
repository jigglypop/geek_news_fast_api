# 💻 GeekNews 개발 실무 & 운영 규칙

## 환경 설정 관리

### 환경변수 분리
모든 민감한 정보는 `.env` 파일로 분리:

```bash
# AI API Keys
OPENAI_API_KEY="sk-..."
HUGGINGFACE_TOKEN="hf_..."
LANGCHAIN_API_KEY="lsv2_..."

# AWS Credentials
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."

# 스케줄링
SCHEDULE_HOUR=8
SCHEDULE_MINUTE=0

# 디자인 테마
DESIGN_THEME="default"
```

### 설정 우선순위
1. **환경변수** (.env 파일)
2. **config.py** (기본값)
3. **하드코딩** (최후 수단)

## 개발 워크플로우

### 기능 개발 순서
1. **config.py** 설정값 추가/수정
2. **generator.py** 로직 구현
3. **templates/** 디자인 적용
4. **server.py** API 엔드포인트 연결
5. **테스트** 및 검증

### 디자인 변경 시
```python
# 1. config.py만 수정
COLOR_CONFIG["cover_background"] = "새로운 그라데이션"
FONT_CONFIG["cover_title"] = "새로운 크기"
TEXT_CONFIG["cover_title"] = "새로운 텍스트"

# 2. 서버 재시작
# 3. 확인: http://localhost:8000/generate
```

## API 개발 규칙

### 엔드포인트 설계
```python
# RESTful 원칙 준수
GET  /              # 서비스 정보
GET  /status        # 상태 확인
POST /generate      # 뉴스 생성 트리거
```

### 응답 형식 통일
```json
{
    "message": "작업 설명",
    "status": "success|error",
    "data": {},
    "timestamp": "ISO 8601"
}
```

### 에러 처리
- HTTP 상태 코드 적절히 활용
- 에러 메시지는 사용자 친화적으로
- 내부 에러는 로그로만 기록

## 스케줄링 & 자동화

### 스케줄러 관리
```python
# 환경변수로 시간 설정
SCHEDULE_HOUR = int(os.getenv("SCHEDULE_HOUR", "8"))
SCHEDULE_MINUTE = int(os.getenv("SCHEDULE_MINUTE", "0"))

# 스케줄 작업 등록
scheduler.add_job(
    scheduled_generation,
    CronTrigger(hour=SCHEDULE_HOUR, minute=SCHEDULE_MINUTE),
    id="daily_news_generation"
)
```

### 백그라운드 작업
- 시간이 오래 걸리는 작업은 백그라운드 처리
- 작업 상태를 로그로 추적
- 실패 시 재시도 로직 구현

## 파일 & 리소스 관리

### 출력 파일 구조
```
output/
├── geek_news_YYYYMMDDHHMI.pdf    # PDF 출력
├── geek_news.html                # HTML 임시파일
├── geek_news.png                 # 최종 이미지
└── images/                       # 페이지별 이미지
    ├── geek_page_01.png
    ├── geek_page_02.png
    └── ...
```

### S3 업로드 관리
- 업로드 성공/실패 로그 기록
- 파일명 중복 방지 (타임스탬프 활용)
- 권한 에러 시 로컬 저장으로 폴백

## 성능 최적화

### 메모리 관리
- 대용량 이미지 처리 후 메모리 해제
- AI 모델은 싱글톤 패턴으로 재사용
- 임시 파일 자동 정리

### 네트워크 최적화
- HTTP 요청에 적절한 타임아웃 설정
- 재시도 로직 구현 (지수 백오프)
- 동시 요청 수 제한

## 로깅 & 모니터링

### 로그 레벨 정의
```python
print(f"[INFO] 일반 정보: {info}")
print(f"[SUCCESS] 성공: {result}")
print(f"[WARNING] 경고: {warning}")
print(f"[ERROR] 오류: {error}")
```

### 중요 지표 추적
- 뉴스 크롤링 성공률
- AI 요약 처리 시간
- 이미지 생성 성공률
- S3 업로드 성공률

## 배포 & 운영

### Docker 컨테이너
```dockerfile
# 필수 환경변수 체크
ENV OPENAI_API_KEY=""
ENV HUGGINGFACE_TOKEN=""
ENV AWS_ACCESS_KEY_ID=""

# 헬스체크 설정
HEALTHCHECK --interval=30s --timeout=10s \
    CMD curl -f http://localhost:8000/ || exit 1
```

### 모니터링 포인트
- 메모리 사용량 (AI 모델 로딩)
- 디스크 사용량 (출력 파일들)
- API 응답 시간
- 스케줄 작업 실행 여부

## 보안 고려사항

### API 키 보호
- `.env` 파일은 `.gitignore`에 포함
- 프로덕션에서는 환경변수로 주입
- 로그에 민감 정보 출력 금지

### 파일 시스템 보안
- 업로드 파일 확장자 검증
- 경로 순회 공격 방지
- 임시 파일 적절한 권한 설정

## 테스트 & 검증

### 기능 테스트 체크리스트
- [ ] 뉴스 크롤링 정상 동작
- [ ] AI 요약 품질 확인  
- [ ] 이미지 생성 완료
- [ ] S3 업로드 성공
- [ ] 스케줄러 정상 실행

### 디자인 변경 테스트
```bash
# 설정 변경 후 테스트 생성
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{"api_type": "huggingface"}'
```

## 문제 해결 가이드

### 자주 발생하는 이슈
1. **AI 모델 로딩 실패** → 토큰 확인, 메모리 여유공간 체크
2. **크롤링 실패** → 네트워크 연결, 사이트 구조 변경 확인
3. **이미지 생성 실패** → Playwright 설치, 폰트 파일 확인
4. **S3 업로드 실패** → AWS 자격증명, 버킷 권한 확인

### 디버깅 방법
- 로그 출력 레벨 조정
- 단계별 중간 결과물 저장
- API 응답 상태 코드 확인 