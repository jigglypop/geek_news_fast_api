from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Optional
from generator import GeekNewsCardGenerator
from config import S3_CONFIG
import asyncio
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import os

app = FastAPI()
scheduler = AsyncIOScheduler()

# 기본 generator 인스턴스 (HuggingFace 사용)
default_generator = GeekNewsCardGenerator(api_type="huggingface")

class GenerateRequest(BaseModel):
    api_type: Optional[str] = "huggingface"

async def scheduled_generation():
    """스케줄된 시간에 실행될 카드뉴스 생성 작업"""
    try:
        print(f"\n{'='*50}")
        print(f"[스케줄러] 자동 생성 시작: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*50}")
        
        image_path = await default_generator.generate()
        
        if image_path and S3_CONFIG.get("use_s3"):
            upload_key = S3_CONFIG.get("upload_key", "output/geek_news.png")
            file_url = default_generator.upload_to_s3(image_path, upload_key)
            
            if file_url:
                print(f"[스케줄러] S3 업로드 완료: {file_url}")
                # 업로드 성공 시 알림이나 로그 저장 등의 추가 작업 가능
            else:
                print("[스케줄러] S3 업로드 실패")
        
        print(f"[스케줄러] 자동 생성 완료: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*50}\n")
        
    except Exception as e:
        print(f"[스케줄러] 오류 발생: {str(e)}")

def run_generation_and_upload(api_type="huggingface"):
    """동기적으로 실행될 전체 생성 및 업로드 프로세스"""
    try:
        print(f"\n[API] 수동 생성 요청 처리 시작 (API 타입: {api_type}): {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # API 타입에 따라 적절한 generator 사용
        if api_type == "chatgpt":
            generator = GeekNewsCardGenerator(api_type="chatgpt")
        else:
            generator = default_generator
        
        # 비동기 함수를 실행하고 결과가 완료될 때까지 기다림
        image_path = asyncio.run(generator.generate())

        if image_path and S3_CONFIG.get("use_s3"):
            upload_key = S3_CONFIG.get("upload_key", "output/geek_news.png")
            file_url = generator.upload_to_s3(image_path, upload_key)
            
            if file_url:
                print(f"[API] S3 업로드 완료: {file_url}")
            else:
                print("[API] S3 업로드 실패")
        elif not image_path:
            print("[API] 이미지 생성 실패")
        else:
            print("[API] S3 사용 설정이 비활성화되어 있음")

    except Exception as e:
        print(f"[API] 백그라운드 작업 중 에러 발생: {str(e)}")

@app.on_event("startup")
async def startup_event():
    """애플리케이션 시작 시 스케줄러 설정"""
    # 환경 변수에서 스케줄 시간 읽기 (기본값: 매일 오전 8시)
    schedule_hour = int(os.getenv("SCHEDULE_HOUR", "8"))
    schedule_minute = int(os.getenv("SCHEDULE_MINUTE", "0"))
    
    # 매일 지정된 시간에 실행되도록 스케줄 설정
    scheduler.add_job(
        scheduled_generation,
        CronTrigger(hour=schedule_hour, minute=schedule_minute),
        id="daily_news_generation",
        name="Daily GeekNews Generation",
        replace_existing=True
    )
    
    scheduler.start()
    print(f"[스케줄러] 매일 {schedule_hour:02d}:{schedule_minute:02d}에 자동 생성 예약됨")

@app.on_event("shutdown")
async def shutdown_event():
    """애플리케이션 종료 시 스케줄러 정리"""
    scheduler.shutdown()

@app.post("/generate", status_code=202)
async def generate_news_card(request: GenerateRequest, background_tasks: BackgroundTasks):
    """수동으로 카드뉴스 생성을 트리거하는 엔드포인트"""
    api_type = request.api_type
    if api_type not in ["huggingface", "chatgpt"]:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 API 타입: {api_type}")
    
    print(f"[API] 카드뉴스 생성 요청 접수 (API 타입: {api_type})")
    background_tasks.add_task(run_generation_and_upload, api_type)
    return {
        "message": f"카드뉴스 생성 작업이 시작되었습니다 (API: {api_type})",
        "api_type": api_type,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/")
def read_root():
    """헬스체크 및 기본 정보 제공"""
    jobs = scheduler.get_jobs()
    next_run = jobs[0].next_run_time if jobs else None
    
    return {
        "service": "GeekNews 카드뉴스 생성기 API",
        "version": "1.0.0",
        "scheduler_active": scheduler.running,
        "next_scheduled_run": next_run.isoformat() if next_run else None,
        "endpoints": {
            "POST /generate": {
                "description": "수동으로 카드뉴스 생성",
                "parameters": {
                    "api_type": "선택 가능한 값: 'huggingface' (기본값), 'chatgpt'"
                },
                "example": {
                    "huggingface": {"api_type": "huggingface"},
                    "chatgpt": {"api_type": "chatgpt"}
                }
            },
            "GET /status": "서비스 상태 확인"
        },
        "supported_apis": ["huggingface", "chatgpt"]
    }

@app.get("/status")
def get_status():
    """서비스 상태 및 스케줄 정보 확인"""
    jobs = scheduler.get_jobs()
    job_info = []
    
    for job in jobs:
        job_info.append({
            "id": job.id,
            "name": job.name,
            "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
            "trigger": str(job.trigger)
        })
    
    return {
        "status": "running",
        "scheduler_running": scheduler.running,
        "scheduled_jobs": job_info,
        "current_time": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 