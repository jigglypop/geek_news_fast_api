# 크롤링 설정
CRAWLING_CONFIG = {
    "news_count": 5,  # 가져올 뉴스 개수
    "base_url": "https://news.hada.io/",
    "timeout": 10  # HTTP 요청 타임아웃 (초)
}

# AI 모델 설정
AI_CONFIG = {
    "model_name": "lcw99/t5-large-korean-text-summary",
    "max_input_length": 1024,
    "max_output_length": 256,
    "min_output_length": 50,
    "length_penalty": 2.0,
    "num_beams": 4
}

# S3 설정 (백업 및 공유용으로 유지)
S3_CONFIG = {
    "use_s3": False,
    "bucket_name": "your-s3-bucket-name",
    "region": "ap-northeast-2",
    "base_url": "https://your-s3-bucket-name.s3.ap-northeast-2.amazonaws.com/",
    "upload_key": "output/geek_news.png"
} 