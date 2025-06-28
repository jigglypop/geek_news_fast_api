import os
import asyncio
from datetime import datetime
from bs4 import BeautifulSoup
from transformers import T5ForConditionalGeneration, AutoTokenizer
import torch
from config import *
from dotenv import load_dotenv
import httpx
from playwright.async_api import async_playwright
import boto3
from botocore.exceptions import NoCredentialsError
from PIL import Image
import openai

load_dotenv()

class GeekNewsCardGenerator:
    def __init__(self, api_type="huggingface"):
        self.output_dir = PATH_CONFIG["output_dir"]
        self.template_dir = PATH_CONFIG["template_dir"]
        self.api_type = api_type
        
        if api_type == "huggingface":
            self._init_model()
        elif api_type == "chatgpt":
            self._init_chatgpt()
        else:
            raise ValueError(f"지원하지 않는 API 타입: {api_type}")
            
        self._init_s3_client()

    def _init_model(self):
        print("한국어 요약 모델 로딩 중...")
        hf_token = os.getenv('HUGGINGFACE_TOKEN')
        if not hf_token:
            print("!!! 중요: HUGGINGFACE_TOKEN 환경 변수를 찾을 수 없습니다. .env 파일을 확인해주세요. !!!")
        else:
            print("Hugging Face 토큰을 성공적으로 로드했습니다.")
            
        self.tokenizer = AutoTokenizer.from_pretrained(
            AI_CONFIG["model_name"], token=hf_token, trust_remote_code=True
        )
        self.model = T5ForConditionalGeneration.from_pretrained(
            AI_CONFIG["model_name"], token=hf_token
        )
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model.to(self.device)
        print("모델 로딩 완료")

    def _init_s3_client(self):
        self.s3_client = None
        if S3_CONFIG.get("use_s3"):
            try:
                self.s3_client = boto3.client('s3', region_name=S3_CONFIG["region"])
                print("S3 클라이언트 초기화 성공")
            except NoCredentialsError:
                print("S3 인증 정보를 찾을 수 없습니다.")
                self.s3_client = None
            except Exception as e:
                print(f"S3 클라이언트 초기화 실패: {e}")
                self.s3_client = None
    
    def _init_chatgpt(self):
        print("ChatGPT API 초기화 중...")
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            print("!!! 중요: OPENAI_API_KEY 환경 변수를 찾을 수 없습니다. .env 파일을 확인해주세요. !!!")
            raise ValueError("OPENAI_API_KEY가 필요합니다.")
        else:
            from openai import OpenAI
            self.openai_client = OpenAI(api_key=api_key)
            print("ChatGPT API 초기화 완료")

    def summarize_text(self, text):
        if self.api_type == "huggingface":
            return self._summarize_with_huggingface(text)
        elif self.api_type == "chatgpt":
            return self._summarize_with_chatgpt(text)
    
    def _summarize_with_huggingface(self, text):
        try:
            inputs = self.tokenizer(
                f"summarize: {text}",
                return_tensors="pt",
                max_length=AI_CONFIG["max_input_length"],
                truncation=True
            ).to(self.device)
            
            outputs = self.model.generate(
                **inputs,
                max_length=AI_CONFIG["max_output_length"],
                min_length=AI_CONFIG["min_output_length"],
                length_penalty=AI_CONFIG["length_penalty"],
                num_beams=AI_CONFIG["num_beams"],
                early_stopping=True
            )
            
            return self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        except Exception as e:
            print(f"요약 생성 중 오류 발생: {e}")
            return text[:150] + "..."
    
    def _summarize_with_chatgpt(self, text):
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "당신은 기술 뉴스를 간결하고 이해하기 쉽게 한국어로 요약하는 전문가입니다."},
                    {"role": "user", "content": f"다음 내용을 50-150자 내외로 한국어로 요약해주세요:\n\n{text[:2000]}"}
                ],
                max_tokens=200,
                temperature=0.7
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"ChatGPT 요약 생성 중 오류 발생: {e}")
            return text[:150] + "..."

    async def get_detail(self, topic_id, timeout=CRAWLING_CONFIG["timeout"]):
        async with httpx.AsyncClient(timeout=timeout) as client:
            try:
                url = f"https://news.hada.io/topic?id={topic_id}"
                print(f"[크롤링] 긱뉴스 상세 페이지 접속 중: {url}")
                response = await client.get(url)
                response.raise_for_status()
                print(f"[크롤링] 긱뉴스 상세 페이지 다운로드 완료: {url}")
                
                soup = BeautifulSoup(response.text, 'lxml')
                content_div = soup.find('div', class_='topic_content')
                if content_div:
                    for tag in content_div.find_all(['script', 'style']):
                        tag.decompose()
                    content = content_div.get_text(strip=True)
                    print(f"[크롤링] 콘텐츠 추출 완료: {len(content)}자")
                    return content
                
                return ""
            except Exception as e:
                print(f"[크롤링 실패] topic_id={topic_id}: {str(e)}")
                return ""

    async def fetch_news(self):
        async with httpx.AsyncClient(timeout=CRAWLING_CONFIG["timeout"]) as client:
            try:
                print(f"\n[크롤링 시작] GeekNews 메인 페이지 접속 중...")
                print(f"URL: {CRAWLING_CONFIG['base_url']}")
                response = await client.get(CRAWLING_CONFIG["base_url"])
                response.raise_for_status()
                print(f"[크롤링] 메인 페이지 다운로드 완료")
                
                soup = BeautifulSoup(response.text, 'lxml')
                news_items = []
                
                topics = soup.find_all('div', class_='topic_row')[:CRAWLING_CONFIG["news_count"]]
                total_topics = len(topics)
                print(f"[크롤링] 총 {total_topics}개의 뉴스 항목 발견\n")
                
                for idx, topic in enumerate(topics, 1):
                    try:
                        print(f"[{idx}/{total_topics}] 뉴스 처리 시작...")
                        title_elem = topic.find('div', class_='topictitle')
                        if not title_elem:
                            print(f"[{idx}/{total_topics}] 제목 요소를 찾을 수 없어 건너뜁니다.")
                            continue
                        
                        title = title_elem.get_text(strip=True)
                        print(f"[{idx}/{total_topics}] 제목: {title[:50]}...")
                        
                        # 원본 링크 추출
                        link = title_elem.find('a')['href'] if title_elem.find('a') else ''
                        full_link = link if link.startswith('http') else f"https://news.hada.io{link}"
                        
                        # topic_id 추출 (댓글 링크에서)
                        topic_id = None
                        comment_link = topic.find('a', href=lambda h: h and '/topic?id=' in h)
                        if comment_link:
                            href = comment_link.get('href', '')
                            if '/topic?id=' in href:
                                topic_id = href.split('id=')[1].split('&')[0]
                        
                        detail_content = ""
                        if topic_id:
                            print(f"[{idx}/{total_topics}] 긱뉴스 상세 내용 크롤링 시작...")
                            detail_content = await self.get_detail(topic_id)
                        
                        if detail_content:
                            print(f"[{idx}/{total_topics}] AI 요약 생성 중...")
                            summary = self.summarize_text(detail_content)
                            print(f"[{idx}/{total_topics}] 요약 생성 완료: {len(summary)}자")
                        else:
                            summary = ""
                            print(f"[{idx}/{total_topics}] 상세 내용이 없어 요약을 생성하지 않습니다.")
                        
                        news_items.append({
                            'number': idx,
                            'title': title,
                            'summary': summary,
                            'link': full_link,
                            'category': 'Tech'
                        })
                        
                        print(f"[{idx}/{total_topics}] ✓ 완료\n")
                        
                    except Exception as e:
                        print(f"[{idx}/{total_topics}] ✗ 오류 발생: {str(e)}\n")
                        continue
                
                print(f"[크롤링 완료] 총 {len(news_items)}개의 뉴스 수집 성공\n")
                return news_items
                
            except Exception as e:
                print(f"[크롤링 실패] 메인 페이지 접속 오류: {str(e)}")
                return []

    def get_character_sources(self):
        character_urls = {}
        for i in range(1, 9):
            character_urls[str(i)] = f"{S3_CONFIG['base_url']}/{S3_CONFIG['character_prefix']}character/{i}.png"
        character_urls['all'] = f"{S3_CONFIG['base_url']}/{S3_CONFIG['character_prefix']}character/all.png"
        return character_urls

    def load_template(self, template_name):
        template_path = os.path.join(self.template_dir, template_name)
        with open(template_path, 'r', encoding='utf-8') as f:
            return f.read()

    def _render_cover_page(self):
        template = self.load_template(PATH_CONFIG["cover_template"])
        characters = self.get_character_sources()
        
        return template.replace('{cover_background}', COLOR_CONFIG["cover_background"]) \
                      .replace('{cover_subtitle}', TEXT_CONFIG["cover_subtitle"]) \
                      .replace('{main_character_src}', characters[IMAGE_CONFIG["main_character"]]) \
                      .replace('{qr_src}', f"{S3_CONFIG['base_url']}/{S3_CONFIG['qr_code_key']}") \
                      .replace('{speech_bubble_emoji}', EMOJI_CONFIG["speech_bubble"]) \
                      .replace('{speech_bubble_text}', TEXT_CONFIG["speech_bubble_text"]) \
                      .replace('{lightbulb_emoji}', EMOJI_CONFIG["lightbulb"]) \
                      .replace('{star_emoji}', EMOJI_CONFIG["star"])

    def _render_news_pages(self, news_items):
        template = self.load_template(PATH_CONFIG["news_template"])
        characters = self.get_character_sources()
        pages = []
        
        for item in news_items:
            page = template.replace('{news_background}', COLOR_CONFIG["news_background"]) \
                          .replace('{category}', item['category']) \
                          .replace('{news_prefix}', TEXT_CONFIG["news_card_prefix"]) \
                          .replace('{number}', str(item['number'])) \
                          .replace('{title}', item['title']) \
                          .replace('{summary}', item['summary']) \
                          .replace('{character_src}', characters.get(str(item['number']), characters['1']))
            pages.append(page)
        
        return '\n'.join(pages)

    def _render_summary_page(self, news_items):
        template = self.load_template(PATH_CONFIG["summary_template"])
        item_template = self.load_template(PATH_CONFIG["summary_item_template"])
        characters = self.get_character_sources()
        
        summary_items = []
        for item in news_items:
            summary_item = item_template.replace('{number}', str(item['number'])) \
                                      .replace('{title}', item['title'])
            summary_items.append(summary_item)
        
        return template.replace('{summary_background}', COLOR_CONFIG["summary_background"]) \
                      .replace('{summary_title}', TEXT_CONFIG["summary_title"]) \
                      .replace('{summary_subtitle}', TEXT_CONFIG["summary_subtitle"]) \
                      .replace('{summary_items}', '\n'.join(summary_items)) \
                      .replace('{all_character_src}', characters[IMAGE_CONFIG["all_characters"]]) \
                      .replace('{count}', str(len(news_items))) \
                      .replace('{summary_footer_text}', TEXT_CONFIG["summary_footer_text"].format(count=len(news_items))) \
                      .replace('{summary_source}', TEXT_CONFIG["summary_source"])

    async def create_html(self, news_items):
        cover = self._render_cover_page()
        news_pages = self._render_news_pages(news_items)
        summary = self._render_summary_page(news_items)
        
        return f"{cover}\n{news_pages}\n{summary}"

    def create_styles(self):
        template = self.load_template(PATH_CONFIG["style_file"])
        
        style = template.replace('{cover_background}', COLOR_CONFIG["cover_background"]) \
                       .replace('{news_background}', COLOR_CONFIG["news_background"]) \
                       .replace('{summary_background}', COLOR_CONFIG["summary_background"])
        
        for key, value in FONT_CONFIG.items():
            style = style.replace(f'{{{key}_size}}', value)
            
        return style

    async def generate_all(self, html_content, css_content):
        print("\n[이미지 생성] 개별 페이지 이미지 생성 시작...")
        
        # Playwright 브라우저 설치 확인
        import subprocess
        try:
            subprocess.run(["playwright", "install", "chromium"], check=True, capture_output=True)
        except:
            pass
            
        async with async_playwright() as p:
            print("[이미지 생성] 브라우저 시작 중...")
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page(viewport={'width': OUTPUT_CONFIG["page_width"], 'height': OUTPUT_CONFIG["page_height"]})
            
            full_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>{css_content}</style>
            </head>
            <body>{html_content}</body>
            </html>
            """
            
            print("[이미지 생성] HTML 콘텐츠 로딩 중...")
            await page.set_content(full_html)
            await page.wait_for_load_state('networkidle')
            
            pages = await page.query_selector_all('.page')
            total_pages = len(pages)
            print(f"[이미지 생성] 총 {total_pages}개 페이지 발견")
            
            for i, page_elem in enumerate(pages):
                print(f"[이미지 생성] 페이지 {i+1}/{total_pages} 처리 중...")
                if OUTPUT_CONFIG["generate_png"]:
                    await page_elem.screenshot(path=f"{self.output_dir}/images/geek_page_{i+1:02d}.png")
                    print(f"  └─ PNG 저장 완료: geek_page_{i+1:02d}.png")
                if OUTPUT_CONFIG["generate_jpg"]:
                    await page_elem.screenshot(path=f"{self.output_dir}/images/geek_page_{i+1:02d}.jpg", quality=OUTPUT_CONFIG["image_quality"])
                    print(f"  └─ JPG 저장 완료: geek_page_{i+1:02d}.jpg")
            
            await browser.close()
            print("[이미지 생성] 개별 페이지 이미지 생성 완료\n")

    async def generate_combined_image(self, news_items):
        print("[통합 이미지 생성] 시작...")
        combined_template = self.load_template("combined_template.html")
        
        cover = self._render_cover_page()
        news_pages = self._render_news_pages(news_items)
        summary = self._render_summary_page(news_items)
        
        all_pages = f"{cover}\n{news_pages}\n{summary}"
        
        full_html = combined_template.replace('{all_pages_content}', all_pages)
        
        async with async_playwright() as p:
            print("[통합 이미지 생성] 브라우저 시작 중...")
            browser = await p.chromium.launch(headless=True)
            
            total_pages = 2 + len(news_items)
            total_height = OUTPUT_CONFIG["page_height"] * total_pages
            print(f"[통합 이미지 생성] 전체 높이: {total_height}px ({total_pages} 페이지)")
            
            page = await browser.new_page(viewport={
                'width': OUTPUT_CONFIG["page_width"], 
                'height': total_height
            })
            
            print("[통합 이미지 생성] HTML 콘텐츠 렌더링 중...")
            await page.set_content(full_html)
            await page.wait_for_load_state('networkidle')
            
            output_path = os.path.join(self.output_dir, "geek_news.png")
            print("[통합 이미지 생성] 스크린샷 캡처 중...")
            await page.screenshot(path=output_path, full_page=True)
            
            await browser.close()
            
            print(f"[통합 이미지 생성] ✓ 완료: {output_path}\n")
            return output_path

    def upload_to_s3(self, file_path, object_name=None):
        """S3 버킷에 파일을 업로드합니다."""
        if not self.s3_client:
            print("S3 클라이언트가 초기화되지 않아 업로드를 건너뜁니다.")
            return None
        
        if object_name is None:
            object_name = os.path.basename(file_path)
            
        try:
            self.s3_client.upload_file(file_path, S3_CONFIG["bucket_name"], object_name)
            print(f"'{file_path}'를 S3 버킷 '{S3_CONFIG['bucket_name']}'에 '{object_name}'으로 업로드했습니다.")
            
            # 업로드된 파일의 URL 생성
            return f"https://{S3_CONFIG['bucket_name']}.s3.{S3_CONFIG['region']}.amazonaws.com/{object_name}"

        except Exception as e:
            print(f"S3 업로드 실패: {e}")
            return None

    def create_directory(self):
        os.makedirs(PATH_CONFIG["output_dir"], exist_ok=True)
        os.makedirs(PATH_CONFIG["image_dir"], exist_ok=True)
        print(f"출력 디렉토리 생성: {PATH_CONFIG['output_dir']}")

    async def generate(self):
        """전체 카드뉴스 생성 프로세스를 실행하고, 최종 결과물 경로를 반환합니다."""
        print("=== 긱뉴스 카드뉴스 생성 시작 ===")
        self.create_directory()
        
        news_items = await self.fetch_news()
        if not news_items:
            print("뉴스를 가져올 수 없습니다.")
            return None

        print(f"{len(news_items)}개의 뉴스를 가져왔습니다.")
        
        # 개별 이미지 및 PDF 생성
        html_content = await self.create_html(news_items)
        css_content = self.create_styles()
        await self.generate_all(html_content, css_content)
        
        # 통합 이미지 생성
        combined_image_path = await self.generate_combined_image(news_items)
        
        print("=== 긱뉴스 카드뉴스 생성 완료 ===")
        return combined_image_path
    
    # ... (이하 모든 헬퍼 함수들은 여기에 위치합니다)
    # summarize_text, get_detail, fetch_news, get_character_sources,
    # load_template, _render_cover_page, _render_news_pages, _render_summary_page,
    # create_html, create_styles, generate_all, generate_combined_image,
    # read_file, create_directory
    
    # 이 클래스 내의 모든 함수를 여기에 복사해 넣습니다.
    # (이 주석은 설명을 위한 것이며, 실제 코드에는 포함되지 않습니다)
    # ... (이전 main.py에 있던 모든 함수를 여기에 붙여넣기) 