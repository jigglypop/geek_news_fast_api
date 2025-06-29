# GeekNews 코딩 스타일 가이드

## 기본 원칙
1. 주석은 작성하지 않음 - 코드가 자명해야 함
2. 의미없는 빈 줄 넣지 않음
3. 이모지 사용 금지
4. 파일은 최소한으로 생성 - 기존 파일 확장 우선

## Python (백엔드) 스타일 가이드

### 네이밍 컨벤션
```python
# 변수와 함수: snake_case
user_name = "GeekNews"
def fetch_news_items():
    pass

# 상수: UPPER_SNAKE_CASE
MAX_NEWS_COUNT = 10
CACHE_TTL_SECONDS = 600

# 클래스: PascalCase
class NewsFetcher:
    pass
```

### 임포트 정리
```python
# 표준 라이브러리
import os
import asyncio
from typing import List, Optional

# 서드파티 라이브러리
from fastapi import FastAPI, HTTPException
import httpx
from bs4 import BeautifulSoup

# 로컬 모듈
from config import CRAWLING_CONFIG, AI_CONFIG
from generator import NewsFetcher
```

### 함수 작성 규칙
```python
async def fetch_news(
    api_type: str = "huggingface", 
    force_refresh: bool = False
) -> List[NewsItem]:
    current_time = time.time()
    
    if not force_refresh and cache_valid():
        return cached_data
    
    try:
        news_items = await fetcher.fetch_news()
        update_cache(news_items)
        return news_items
    except Exception as e:
        print(f"[ERROR] 뉴스 가져오기 실패: {e}")
        raise HTTPException(status_code=500, detail="서버 오류")
```

### 에러 처리
```python
# 구체적인 예외 처리
try:
    response = await client.get(url)
    response.raise_for_status()
except httpx.RequestError as e:
    print(f"[ERROR] 네트워크 오류: {e}")
    return []
except httpx.HTTPStatusError as e:
    print(f"[ERROR] HTTP {e.response.status_code}: {e}")
    return []
```

### 로깅 형식
```python
print(f"[모듈명] 상태: 상세 정보")
print(f"[CRAWLING] GeekNews: 수집된 뉴스 10개")
print(f"[ERROR] 크롤링 실패: {error}")
print(f"[SUCCESS] 이미지 생성 완료: output/geek_news.png")
```

## TypeScript/React (프론트엔드) 스타일 가이드

### 네이밍 컨벤션
```typescript
// 변수와 함수: camelCase
const userName = "GeekNews";
const fetchNewsItems = () => {};

// 상수: UPPER_SNAKE_CASE
const MAX_NEWS_COUNT = 10;
const CACHE_TTL_SECONDS = 600;

// 타입과 인터페이스: PascalCase
interface NewsItem {
  id: string;
  title: string;
}

// React 컴포넌트: PascalCase
const NewsEditor: React.FC = () => {};
```

### 타입 정의
```typescript
// 타입은 별도 파일로 분리
// types/index.ts
export interface NewsItem {
  id: string;
  title: string;
  description: string;
  sourceUrl: string;
  discussionUrl: string;
}

export type PreviewMode = 'cover' | 'news' | 'summary';
```

### React 컴포넌트 구조
```typescript
interface EditorProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const Editor: React.FC<EditorProps> = ({ theme, onThemeChange }) => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const fetchNews = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      const data = await api.fetchNews(forceRefresh);
      setNewsItems(data);
    } catch (error) {
      console.error('뉴스 가져오기 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchNews();
  }, [fetchNews]);
  
  if (isLoading) {
    return <div>로딩 중...</div>;
  }
  
  return <div>...</div>;
};
```

### 상태 관리 (zustand)
```typescript
interface ElementStore {
  elements: DraggableElement[];
  selectedElement: string | null;
  setElements: (elements: DraggableElement[]) => void;
  updateElement: (element: DraggableElement) => void;
  selectElement: (id: string | null) => void;
}

export const useElementStore = create<ElementStore>((set) => ({
  elements: [],
  selectedElement: null,
  setElements: (elements) => set({ elements }),
  updateElement: (element) => set((state) => ({
    elements: state.elements.map((el) =>
      el.id === element.id ? element : el
    ),
  })),
  selectElement: (id) => set({ selectedElement: id }),
}));
```

### CSS 클래스 네이밍
```css
/* kebab-case 사용 */
.news-container {
  background-color: rgba(255, 255, 255, 0.1);
}

.news-title-text {
  font-size: 24px;
  color: white;
}

/* 컴포넌트 기반 네이밍 */
.editor-toolbar {
  display: flex;
  gap: 8px;
}

.editor-toolbar-button {
  padding: 8px 16px;
}
```

## 파일 구조 가이드

### 백엔드 구조
```
/
├── server.py          # FastAPI 앱과 라우트
├── generator.py       # 크롤링/요약 로직
├── config.py          # 설정값
├── models.py          # Pydantic 모델 (필요시)
└── utils/            # 유틸리티 함수
    ├── scheduler.py   # 스케줄링 로직
    └── exporter.py    # 내보내기 로직
```

### 프론트엔드 구조
```
web-editor/src/
├── components/        # React 컴포넌트
│   ├── Editor.tsx
│   ├── Toolbar.tsx
│   └── ...
├── store/            # zustand 스토어
│   ├── elementStore.ts
│   └── configStore.ts
├── types/            # TypeScript 타입
│   └── index.ts
├── utils/            # 유틸리티 함수
│   └── api.ts
├── styles/           # 스타일 파일
│   └── global.css
└── App.tsx
```

## API 설계 원칙

### RESTful 엔드포인트
```python
# 명사 사용, 동사 사용 금지
GET    /api/news          # 뉴스 목록 조회
POST   /api/state         # 상태 저장
GET    /api/state         # 상태 조회
POST   /api/export        # 내보내기
DELETE /api/cache         # 캐시 삭제
```

### 응답 형식
```python
# 성공 응답
{
    "status": "success",
    "data": {...},
    "timestamp": "2025-01-15T12:00:00Z"
}

# 에러 응답
{
    "status": "error",
    "message": "구체적인 에러 메시지",
    "code": "ERROR_CODE",
    "timestamp": "2025-01-15T12:00:00Z"
}
```

## 비동기 처리 패턴

### Python 비동기
```python
# httpx.AsyncClient 사용
async with httpx.AsyncClient() as client:
    response = await client.get(url)
    
# 병렬 처리
results = await asyncio.gather(
    fetch_page(1),
    fetch_page(2),
    fetch_page(3)
)

# 파일 I/O
await asyncio.to_thread(save_file, content)
```

### TypeScript 비동기
```typescript
// async/await 패턴
const fetchData = async () => {
  try {
    const response = await fetch('/api/news');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('데이터 가져오기 실패:', error);
    throw error;
  }
};

// Promise.all 사용
const results = await Promise.all([
  fetchNews(),
  fetchConfig(),
  fetchTheme()
]);
```

## 성능 최적화 원칙

### 백엔드
- 싱글톤 패턴으로 AI 모델 재사용
- 적절한 캐싱 전략 사용
- 동시 요청 수 제한 (세마포어)
- 타임아웃 설정

### 프론트엔드
- React.memo로 불필요한 리렌더링 방지
- useMemo/useCallback 적절히 사용
- 큰 리스트는 가상화 적용
- 이미지 lazy loading

## 테스트 작성 (선택사항)
```python
# pytest 사용
async def test_fetch_news():
    fetcher = NewsFetcher()
    news = await fetcher.fetch_news()
    assert len(news) > 0
    assert all(item.title for item in news)
```

```typescript
// Jest/React Testing Library
test('뉴스 로딩 테스트', async () => {
  render(<Editor />);
  expect(screen.getByText('로딩 중...')).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.getByText('GeekNews')).toBeInTheDocument();
  });
});
``` 