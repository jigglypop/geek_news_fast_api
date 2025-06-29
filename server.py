from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from generator import NewsFetcher
import os
import time
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
import json
from pathlib import Path
import aiofiles
from playwright.async_api import async_playwright
from PIL import Image
import io
import base64

app = FastAPI()

# --- Cache-Konfiguration ---
CACHE = {
    "news": None,
    "last_updated": 0
}
CACHE_TTL_SECONDS = 600  # 10 Minuten

scheduler = AsyncIOScheduler()
schedule_hour = int(os.getenv("SCHEDULE_HOUR", 8))
schedule_minute = int(os.getenv("SCHEDULE_MINUTE", 0))

# CORS 미들웨어 추가 (웹 에디터에서 API 호출을 허용하기 위해)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 실제 프로덕션에서는 특정 도메인으로 제한해야 합니다.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# AI 모델 타입에 따라 NewsFetcher 인스턴스를 관리
fetchers = {
    "huggingface": NewsFetcher(api_type="huggingface"),
    # "openai": NewsFetcher(api_type="openai") # 필요 시 주석 해제
}

class NewsItem(BaseModel):
    id: str
    title: str
    description: str
    source_url: str
    discussion_url: str

class SaveStateRequest(BaseModel):
    version: str = "1.0"
    news_data: dict
    edited_elements: dict
    theme: dict
    config: dict

class ExportRequest(BaseModel):
    html_content: str
    page_type: str  # 'cover', 'news', 'summary'
    page_index: Optional[int] = 0
    export_format: str = "png"  # 'png', 'pdf', 'html'

DATA_DIR = Path("./data/saved_states")
DATA_DIR.mkdir(parents=True, exist_ok=True)

@app.get("/api/news", response_model=List[NewsItem])
async def get_news(api_type: Optional[str] = "huggingface", force_refresh: bool = False):
    """
    GeekNews를 크롤링하고 요약하여 뉴스 목록을 반환합니다.
    결과는 10분 동안 캐시됩니다.
    `force_refresh=true` 쿼리 파라미터를 사용하여 캐시를 무시하고 새로고침할 수 있습니다.
    """
    current_time = time.time()
    
    # 캐시 확인
    if not force_refresh and CACHE["news"] and (current_time - CACHE["last_updated"] < CACHE_TTL_SECONDS):
        print("[캐시] 캐시된 뉴스 데이터를 반환합니다.")
        return CACHE["news"]

    if api_type not in fetchers:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 API 타입: {api_type}. 사용 가능: {list(fetchers.keys())}")
    
    try:
        print("[API] 새로운 뉴스 데이터를 가져옵니다 (캐시 만료 또는 강제 새로고침).")
        fetcher = fetchers[api_type]
        news_items = await fetcher.fetch_news()
        
        # 캐시 업데이트
        CACHE["news"] = news_items
        CACHE["last_updated"] = current_time
        
        # force_refresh인 경우 자동 저장
        if force_refresh:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = DATA_DIR / f"manual_refresh_{timestamp}.json"
            
            save_data = {
                "version": "1.0",
                "saved_at": datetime.now().isoformat(),
                "crawled_at": datetime.now().isoformat(),
                "auto_saved": False,
                "force_refresh": True,
                "news_count": len(news_items),
                "news_items": news_items
            }
            
            async with aiofiles.open(filename, "w", encoding="utf-8") as f:
                await f.write(json.dumps(save_data, ensure_ascii=False, indent=2))
            
            print(f"[API] 강제 새로고침 데이터 저장 완료: {filename}")
        
        return news_items
    except Exception as e:
        print(f"[에러] /api/news 처리 중 오류 발생: {e}")
        raise HTTPException(status_code=500, detail="뉴스 정보를 가져오는 중 서버에서 오류가 발생했습니다.")

@app.get("/")
def read_root():
    """헬스체크 및 기본 정보 제공"""
    return {
        "service": "GeekNews News Fetcher API",
        "version": "2.2.0",
        "status": "healthy",
        "cache_status": {
            "cached": CACHE["news"] is not None,
            "last_updated": time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(CACHE["last_updated"])),
            "ttl_seconds": CACHE_TTL_SECONDS
        },
        "scheduler_status": {
            "enabled": scheduler.running,
            "schedule_time": f"{schedule_hour:02d}:{schedule_minute:02d}"
        },
        "endpoints": {
            "GET /api/news": {
                "description": "GeekNews 최신 뉴스를 크롤링하고 AI로 요약하여 반환합니다.",
                "parameters": {
                    "api_type": "선택 가능한 값: 'huggingface' (기본값)",
                    "force_refresh": "true 또는 false. 캐시를 무시하고 새로 데이터를 가져옵니다."
                }
            },
            "GET /api/schedule-status": {
                "description": "스케줄러 상태와 다음 실행 시간을 확인합니다."
            },
            "POST /api/state": {
                "description": "편집된 상태를 서버에 저장합니다.",
                "body": "SaveStateRequest 모델"
            },
            "GET /api/state": {
                "description": "저장된 상태를 불러옵니다.",
                "parameters": {
                    "filename": "특정 파일명 (선택사항, 없으면 최신 파일)"
                }
            },
            "GET /api/state/list": {
                "description": "저장된 상태 목록을 조회합니다."
            },
            "POST /api/export": {
                "description": "HTML 콘텐츠를 이미지 또는 PDF로 변환하여 저장합니다.",
                "body": "ExportRequest 모델"
            },
            "POST /api/export/combine-images": {
                "description": "여러 이미지를 하나의 이미지로 결합합니다."
            }
        }
    }

async def scheduled_news_fetch():
    print(f"[SCHEDULER] 정기 뉴스 크롤링 시작: {datetime.now()}")
    try:
        fetcher = fetchers["huggingface"]
        news_items = await fetcher.fetch_news()
        CACHE["news"] = news_items
        CACHE["last_updated"] = time.time()
        print(f"[SCHEDULER] 정기 뉴스 크롤링 완료: {len(news_items)}개 뉴스")
        
        # 크롤링 후 자동 저장
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = DATA_DIR / f"auto_crawled_{timestamp}.json"
        
        save_data = {
            "version": "1.0",
            "saved_at": datetime.now().isoformat(),
            "crawled_at": datetime.now().isoformat(),
            "auto_saved": True,
            "news_count": len(news_items),
            "news_items": news_items
        }
        
        async with aiofiles.open(filename, "w", encoding="utf-8") as f:
            await f.write(json.dumps(save_data, ensure_ascii=False, indent=2))
        
        print(f"[SCHEDULER] 크롤링 데이터 자동 저장 완료: {filename}")
    except Exception as e:
        print(f"[ERROR] 정기 뉴스 크롤링 실패: {e}")

@app.on_event("startup")
async def startup_event():
    scheduler.add_job(
        scheduled_news_fetch,
        CronTrigger(hour=schedule_hour, minute=schedule_minute),
        id="daily_news_fetch",
        replace_existing=True
    )
    scheduler.start()
    print(f"[SCHEDULER] 스케줄러 시작: 매일 {schedule_hour:02d}:{schedule_minute:02d}에 뉴스 크롤링")

@app.on_event("shutdown")
async def shutdown_event():
    scheduler.shutdown()
    print("[SCHEDULER] 스케줄러 종료")

@app.get("/api/schedule-status")
async def get_schedule_status():
    job = scheduler.get_job("daily_news_fetch")
    if job:
        next_run = job.next_run_time
        return {
            "status": "active",
            "schedule_time": f"{schedule_hour:02d}:{schedule_minute:02d}",
            "next_run": next_run.isoformat() if next_run else None,
            "timezone": str(job.trigger.timezone) if hasattr(job.trigger, 'timezone') else None
        }
    return {
        "status": "inactive",
        "schedule_time": f"{schedule_hour:02d}:{schedule_minute:02d}",
        "message": "스케줄러가 실행되지 않고 있습니다"
    }

@app.post("/api/state")
async def save_state(state: SaveStateRequest):
    try:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = DATA_DIR / f"state_{timestamp}.json"
        
        save_data = state.dict()
        save_data["saved_at"] = datetime.now().isoformat()
        
        async with aiofiles.open(filename, "w", encoding="utf-8") as f:
            await f.write(json.dumps(save_data, ensure_ascii=False, indent=2))
        
        print(f"[SAVE] 상태 저장 완료: {filename}")
        return {
            "status": "success",
            "filename": filename.name,
            "saved_at": save_data["saved_at"]
        }
    except Exception as e:
        print(f"[ERROR] 상태 저장 실패: {e}")
        raise HTTPException(status_code=500, detail="상태 저장 중 오류가 발생했습니다")

@app.get("/api/state")
async def load_state(filename: Optional[str] = None):
    try:
        if filename:
            filepath = DATA_DIR / filename
        else:
            files = sorted(DATA_DIR.glob("state_*.json"), reverse=True)
            if not files:
                return {
                    "status": "no_data",
                    "message": "저장된 상태가 없습니다"
                }
            filepath = files[0]
        
        if not filepath.exists():
            raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다")
        
        async with aiofiles.open(filepath, "r", encoding="utf-8") as f:
            content = await f.read()
            state_data = json.loads(content)
        
        print(f"[LOAD] 상태 불러오기 완료: {filepath.name}")
        return {
            "status": "success",
            "data": state_data,
            "filename": filepath.name
        }
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다")
    except Exception as e:
        print(f"[ERROR] 상태 불러오기 실패: {e}")
        raise HTTPException(status_code=500, detail="상태 불러오기 중 오류가 발생했습니다")

@app.get("/api/state/list")
async def list_saved_states():
    try:
        files = sorted(DATA_DIR.glob("state_*.json"), reverse=True)
        states = []
        
        for file in files[:20]:
            async with aiofiles.open(file, "r", encoding="utf-8") as f:
                content = await f.read()
                data = json.loads(content)
                states.append({
                    "filename": file.name,
                    "saved_at": data.get("saved_at"),
                    "version": data.get("version", "1.0")
                })
        
        return {
            "status": "success",
            "states": states,
            "total": len(states)
        }
    except Exception as e:
        print(f"[ERROR] 상태 목록 조회 실패: {e}")
        raise HTTPException(status_code=500, detail="상태 목록 조회 중 오류가 발생했습니다")

@app.post("/api/export")
async def export_content(request: ExportRequest):
    try:
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        output_dir = Path("./output")
        output_dir.mkdir(exist_ok=True)
        
        if request.export_format == "html":
            filename = output_dir / f"geek_news_{request.page_type}_{timestamp}.html"
            async with aiofiles.open(filename, "w", encoding="utf-8") as f:
                await f.write(request.html_content)
            
            print(f"[EXPORT] HTML 저장 완료: {filename}")
            return {
                "status": "success",
                "filename": filename.name,
                "format": "html"
            }
        
        elif request.export_format in ["png", "pdf"]:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page(viewport={'width': 1080, 'height': 1080})
                
                await page.set_content(request.html_content)
                await page.wait_for_load_state('networkidle')
                
                if request.export_format == "png":
                    filename = output_dir / f"geek_news_{request.page_type}_{request.page_index:02d}_{timestamp}.png"
                    await page.screenshot(path=str(filename), full_page=False)
                    print(f"[EXPORT] PNG 저장 완료: {filename}")
                
                elif request.export_format == "pdf":
                    filename = output_dir / f"geek_news_{request.page_type}_{timestamp}.pdf"
                    await page.pdf(
                        path=str(filename),
                        format='A4',
                        print_background=True,
                        margin={'top': '0', 'right': '0', 'bottom': '0', 'left': '0'}
                    )
                    print(f"[EXPORT] PDF 저장 완료: {filename}")
                
                await browser.close()
                
            return {
                "status": "success",
                "filename": filename.name,
                "format": request.export_format
            }
        
        else:
            raise HTTPException(status_code=400, detail="지원하지 않는 형식입니다")
            
    except Exception as e:
        print(f"[ERROR] 내보내기 실패: {e}")
        raise HTTPException(status_code=500, detail="내보내기 중 오류가 발생했습니다")

@app.post("/api/export/combine-images")
async def combine_images():
    try:
        output_dir = Path("./output")
        image_files = sorted(output_dir.glob("geek_news_*_*.png"))
        
        if not image_files:
            raise HTTPException(status_code=404, detail="결합할 이미지가 없습니다")
        
        images = []
        for img_file in image_files:
            img = Image.open(img_file)
            images.append(img)
        
        total_height = sum(img.height for img in images)
        max_width = max(img.width for img in images)
        
        combined_image = Image.new('RGB', (max_width, total_height))
        y_offset = 0
        
        for img in images:
            combined_image.paste(img, (0, y_offset))
            y_offset += img.height
        
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        combined_filename = output_dir / f"geek_news_combined_{timestamp}.png"
        combined_image.save(combined_filename)
        
        print(f"[EXPORT] 이미지 결합 완료: {combined_filename}")
        return {
            "status": "success",
            "filename": combined_filename.name,
            "total_pages": len(images)
        }
        
    except Exception as e:
        print(f"[ERROR] 이미지 결합 실패: {e}")
        raise HTTPException(status_code=500, detail="이미지 결합 중 오류가 발생했습니다")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port) 