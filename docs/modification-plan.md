# GeekNews 카드뉴스 생성 시스템 수정 계획서

## 현재 시스템 분석

### 백엔드 (FastAPI)
- `/api/news` 엔드포인트로 뉴스 크롤링/요약 제공
- 10분 캐시, force_refresh 파라미터 지원
- HuggingFace/OpenAI 모델로 한국어 요약

### 프론트엔드 (React + TypeScript)
- 드래그 가능한 에디터 인터페이스
- cover/news/summary 3가지 프리뷰 모드
- zustand로 상태 관리
- 실시간 편집만 가능 (저장 기능 없음)

### 누락된 기능
- 자정 스케줄링
- 편집 내용 저장/불러오기
- PDF/이미지 내보내기
- 설정 저장

## 수정 계획

### 1. 백엔드 개선 사항

#### 1.1 스케줄링 시스템 추가
- APScheduler 라이브러리 활용 (이미 requirements.txt에 포함됨)
- 환경변수 활용 (docker-compose.yml에 이미 정의됨):
  - SCHEDULE_HOUR: 실행 시간 (기본값: 8)
  - SCHEDULE_MINUTE: 실행 분 (기본값: 0)
- 매일 설정된 시간에 크롤링 작업 스케줄 등록
- 스케줄 상태 확인 API 추가

#### 1.2 데이터 저장 API 추가
```
POST /api/save-state     # 편집 상태 저장
GET  /api/load-state     # 저장된 상태 불러오기
POST /api/export         # PDF/이미지 내보내기
GET  /api/schedule-status # 스케줄 상태 확인
```

#### 1.3 내보내기 기능 구현
- HTML to PDF 변환 (weasyprint/pdfkit)
- HTML to Image 변환 (playwright/selenium)
- 페이지별 이미지 생성
- 전체 합친 이미지 생성

### 2. 프론트엔드 개선 사항

#### 2.1 로컬 상태 관리 시스템
- persistStore.ts: localStorage/IndexedDB 연동
- configStore.ts: 설정 관리
- 자동 저장 기능 (debounce 적용)

#### 2.2 UI 컴포넌트 추가
- SaveLoadPanel: 저장/불러오기 UI
- ExportPanel: 내보내기 옵션 UI
- ScheduleStatus: 스케줄 상태 표시
- ConfigPanel: 설정 관리 UI

#### 2.3 내보내기 기능
- 내보내기 버튼 추가
- 내보내기 옵션 선택 (PDF/PNG/HTML)
- 페이지별/전체 선택 옵션

### 3. 데이터 저장 구조

#### 3.1 저장 데이터 스키마
```json
{
  "version": "1.0",
  "savedAt": "2025-01-15T12:00:00Z",
  "newsData": {
    "fetchedAt": "2025-01-15T00:00:00Z",
    "items": [...]
  },
  "editedElements": {
    "cover": [...],
    "news": [...],
    "summary": [...]
  },
  "theme": {...},
  "config": {
    "scheduleTime": "00:00",
    "autoSave": true,
    "exportFormat": ["pdf", "png"]
  }
}
```

#### 3.2 저장 위치
- 프론트엔드: localStorage (임시), IndexedDB (영구)
- 백엔드: ./data/saved_states/ 디렉토리
- 내보낸 파일: ./output/ 디렉토리 유지

### 4. 작업 우선순위

#### Phase 1: 기본 인프라 (1-2일) ✅ 완료
1. 백엔드 스케줄러 설정 ✅
2. 저장/불러오기 API 구현 ✅
3. 프론트엔드 persistStore 구현 ✅

#### Phase 2: 핵심 기능 (2-3일) ✅ 완료
1. 자동 저장 기능 ✅
2. 수동 저장/불러오기 UI ✅
3. 기본 내보내기 기능 (HTML → PNG) ✅

#### Phase 3: 고급 기능 (2-3일)
1. PDF 내보내기
2. 페이지별 이미지 생성
3. 설정 관리 UI
4. 스케줄 상태 모니터링

#### Phase 4: 최적화 (1-2일)
1. 에러 처리 강화
2. 성능 최적화
3. 테스트 및 문서화

### 5. 기술 스택 추가

#### 백엔드 의존성 추가
- playwright/selenium: HTML to Image (playwright는 이미 포함됨)
- weasyprint/pdfkit: HTML to PDF
- aiofiles: 비동기 파일 처리

#### 프론트엔드 의존성 추가
- idb: IndexedDB wrapper
- date-fns: 날짜 처리

## 주의사항
1. 기존 API 엔드포인트 스펙 유지
2. 레이어 아키텍처 준수
3. 비동기 처리 패턴 일관성 유지
4. 크롤링 파이프라인 보호
5. 에러 처리 및 폴백 구현 