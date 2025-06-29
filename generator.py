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
from urllib.parse import urljoin

load_dotenv()

class GeekNewsCardGenerator:
    def __init__(self, api_type="huggingface"):
        self.output_dir = PATH_CONFIG["output_dir"]
        self.template_dir = PATH_CONFIG["template_dir"]
        self.api_type = api_type
        
        if api_type == "huggingface":
            self._init_model()
        elif api_type == "openai":
            self._init_chatgpt()
        else:
            raise ValueError(f"지원하지 않는 API 타입: {api_type}")
            
        self._init_s3_client()

    def _init_model(self):
        print("HuggingFace 요약 모델 로딩 중...")
        hf_token = os.getenv('HUGGINGFACE_TOKEN')
        self.tokenizer = AutoTokenizer.from_pretrained(
            AI_CONFIG["model_name"], token=hf_token, trust_remote_code=True
        )
        self.model = T5ForConditionalGeneration.from_pretrained(
            AI_CONFIG["model_name"], token=hf_token
        )
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model.to(self.device)
        print("✓ HuggingFace 모델 로딩 완료")

    def _init_chatgpt(self):
        print("OpenAI API 초기화 중...")
        self.openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        print("✓ OpenAI API 초기화 완료")
        
    def _init_s3_client(self):
        self.s3_client = None
        if S3_CONFIG["use_s3"]:
            print("S3 클라이언트 초기화 중...")
            try:
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
                    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
                    region_name=S3_CONFIG["region"]
                )
                print("✓ S3 클라이언트 초기화 완료")
            except NoCredentialsError:
                print("[에러] AWS 자격 증명을 찾을 수 없습니다. .env 파일을 확인하세요.")
            except Exception as e:
                print(f"[에러] S3 클라이언트 초기화 실패: {e}")

    async def summarize_text(self, text):
        if not text or len(text.strip()) < 50:
            return ""

        if self.api_type == "huggingface":
            return await self._summarize_with_huggingface(text)
        elif self.api_type == "openai":
            return await self._summarize_with_openai(text)
        return "지원하지 않는 API 타입입니다."

    async def _summarize_with_huggingface(self, text):
        if not text or len(text.strip()) < 50:
            print(f"  [요약 건너뜀] 텍스트가 너무 짧습니다: {text[:100]}")
            return ""
        print(f"  [요약 원문] {text[:150]}...")
        try:
            prompt_template = self.load_template(PATH_CONFIG["summary_prompt"])
            prompt = prompt_template.format(text=text)
            inputs = self.tokenizer(
                prompt,
                max_length=AI_CONFIG["max_input_length"],
                truncation=True,
                return_tensors="pt"
            ).to(self.device)
            summary_ids = self.model.generate(
                inputs["input_ids"],
                max_length=AI_CONFIG["max_output_length"],
                min_length=AI_CONFIG["min_output_length"],
                length_penalty=AI_CONFIG["length_penalty"],
                num_beams=AI_CONFIG["num_beams"],
                early_stopping=True
            )
            summary = self.tokenizer.decode(summary_ids[0], skip_special_tokens=True)
            print(f"  [요약 성공] {summary.strip()}")
            return summary.strip()
        except Exception as e:
            print(f"  [요약 실패] 오류: {e}")
            return "요약 생성에 실패했습니다."
    
    async def _summarize_with_openai(self, text):
        try:
            response = await asyncio.to_thread(
                self.openai_client.chat.completions.create,
                model="gpt-4-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that summarizes news articles in Korean."},
                    {"role": "user", "content": f"다음 뉴스를 한국어로 요약해줘: {text}"}
                ]
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"[에러] OpenAI 요약 실패: {e}")
            return ""

    async def get_detail(self, topic_id):
        try:
            async with httpx.AsyncClient() as client:
                url = f'https://news.hada.io/topic?id={topic_id}'
                response = await client.get(url)
                soup = BeautifulSoup(response.text, 'lxml')
                contents_elem = soup.find('div', class_='topic_contents')
                if contents_elem:
                    return contents_elem.get_text(separator=' ', strip=True)
                desc_elem = soup.find('div', class_='topic_desc')
                if desc_elem:
                    return desc_elem.get_text(strip=True)
                return ""
        except Exception as e:
            print(f"긱뉴스 상세 정보 가져오기 실패: {e}")
            return ""

    async def fetch_news(self):
        async with httpx.AsyncClient(timeout=CRAWLING_CONFIG["timeout"]) as client:
            response = await client.get(CRAWLING_CONFIG["base_url"])
            soup = BeautifulSoup(response.text, 'lxml')
            news_items = []
            topics = soup.find_all('div', class_='topic_row')[:CRAWLING_CONFIG["news_count"]]
            for topic in topics:
                title_elem = topic.find('div', class_='topictitle')
                if not title_elem: continue
                title_link = title_elem.find('a')
                if not title_link: continue

                title = title_link.text.strip()
                original_link = title_link.get('href', '')

                topic_id = None
                all_links = topic.find_all('a')
                for link in all_links:
                    href = link.get('href', '')
                    if 'topic?id=' in href:
                        try:
                            topic_id = href.split('id=')[-1].split('&')[0]
                            break
                        except:
                            pass

                desc_elem = topic.find('span', class_='topicdesc')
                desc = desc_elem.text.strip() if desc_elem else ''

                if topic_id:
                    detailed_desc = await self.get_detail(topic_id)
                    if detailed_desc and len(detailed_desc) > len(desc):
                        desc = detailed_desc

                summarized_desc = await self.summarize_text(desc)
                news_items.append({
                    'title': title,
                    'description': summarized_desc if summarized_desc else "요약 정보가 없습니다.",
                    'link': original_link,
                    'topic_id': topic_id
                })
            return news_items

    def get_character_sources(self):
        base_url = S3_CONFIG["base_url"]
        prefix = S3_CONFIG["character_prefix"]
        
        # S3에서 직접 파일 목록을 가져오거나, 고정된 이름 사용
        # 여기서는 고정된 이름 사용
        names = IMAGE_CONFIG.get("character_names", [])
        
        # urljoin을 사용하여 올바른 URL 생성
        return {name: urljoin(base_url, f"{prefix}{name}.png") for name in names}

    def load_template(self, template_name):
        template_path = os.path.join(self.template_dir, template_name)
        with open(template_path, 'r', encoding='utf-8') as f:
            return f.read()

    def _render_cover_page(self, main_character_src, qr_src):
        cover_template = self.load_template(PATH_CONFIG["cover_template"])
        character_html = f'<img src="{main_character_src}" class="character main-character" alt="캐릭터" />' if main_character_src else ''
        qr_html = f'<div class="qr-section"><img src="{qr_src}" class="qr-code" alt="QR코드" /></div>' if qr_src else ''

        return cover_template.replace('{cover_subtitle}', TEXT_CONFIG["cover_subtitle"]) \
                           .replace('{cover_title}', TEXT_CONFIG["cover_title"]) \
                           .replace('{character_image}', character_html) \
                           .replace('{qr_section}', qr_html)

    def _render_news_pages(self, news_items, page_characters):
        news_template = self.load_template(PATH_CONFIG["news_template"])
        pages_html = ""
        
        for i in range(0, len(news_items), 2):
            item1 = news_items[i]
            item2 = news_items[i + 1] if i + 1 < len(news_items) else None
            
            character_src = page_characters[i // 2 % len(page_characters)] if page_characters else None
            character_html = f'<img src="{character_src}" class="page-character" alt="캐릭터" />' if character_src else ''

            def get_topic_category(news):
                if not news: return ""
                link_lower = news.get('link', '').lower()
                title_lower = news.get('title', '').lower()
                if "github" in link_lower or "git" in title_lower: return "개발"
                elif "youtube" in link_lower: return "영상"
                elif "blog" in link_lower: return "블로그"
                elif "ai" in title_lower or "gemini" in title_lower: return "AI"
                elif "데이터" in title_lower or "data" in title_lower: return "데이터"
                return "기술"

            page_html = news_template.replace('{news_prefix}', TEXT_CONFIG.get("news_card_prefix", "GeekNews")) \
                                     .replace('{number1}', str(i + 1)) \
                                     .replace('{category1}', get_topic_category(item1)) \
                                     .replace('{title1}', item1['title']) \
                                     .replace('{summary1}', item1.get('description', '')) \
                                     .replace('{character_src}', character_html)

            if item2:
                page_html = page_html.replace('{number2}', str(i + 2)) \
                                     .replace('{category2}', get_topic_category(item2)) \
                                     .replace('{title2}', item2['title']) \
                                     .replace('{summary2}', item2.get('description', ''))
            else:
                page_html = page_html.replace('&amp; #{number2}', '') \
                                     .replace('{number2}', "") \
                                     .replace('{category2}', "") \
                                     .replace('{title2}', "") \
                                     .replace('{summary2}', "") \
                                     .replace('<div class="news-separator"></div>', '') \
                                     .replace('<div class="news-content-section second-news">', '<div class="news-content-section second-news" style="display:none;">')

            pages_html += page_html
            
        return pages_html

    def _render_summary_page(self, news_items):
        current_date = datetime.now().strftime("%Y년 %m월 %d일")
        summary_item_template = self.load_template(PATH_CONFIG["summary_item_template"])
        summary_items_html = ""

        for index, news in enumerate(news_items, 1):
            topic_category = "기술"
            link_lower = news.get('link', '').lower()
            title_lower = news.get('title', '').lower()
            if "github" in link_lower or "git" in title_lower: topic_category = "개발"
            elif "ai" in title_lower or "gemini" in title_lower: topic_category = "AI"
            elif "데이터" in title_lower or "data" in title_lower: topic_category = "데이터"

            summary_items_html += summary_item_template.format(
                number=index,
                category=topic_category,
                title=news['title']
            )

        summary_template = self.load_template(PATH_CONFIG["summary_template"])
        return summary_template.format(
            summary_title=TEXT_CONFIG["summary_title"],
            summary_date=current_date,
            summary_subtitle=TEXT_CONFIG["summary_subtitle"],
            summary_items=summary_items_html,
            summary_footer=TEXT_CONFIG["summary_footer_text"].format(count=len(news_items)),
            summary_source=TEXT_CONFIG["summary_source"]
        )

    async def create_html(self, news_items):
        available_characters = self.get_character_sources()
        main_character_src = available_characters.get(IMAGE_CONFIG["main_character"])
        page_characters = [
            src for name, src in available_characters.items()
            if name != IMAGE_CONFIG["main_character"] and name != IMAGE_CONFIG["all_characters"]
        ]
        qr_src = f"{S3_CONFIG.get('base_url', '')}{S3_CONFIG.get('qr_code_key', '')}"
        
        cover_html = self._render_cover_page(main_character_src, qr_src)
        news_html = self._render_news_pages(news_items, page_characters)
        summary_html = self._render_summary_page(news_items)

        return f"{cover_html}{news_html}{summary_html}"

    def create_styles(self):
        """템플릿과 설정값을 결합하여 최종 CSS를 생성합니다."""
        base_css = self.load_template(PATH_CONFIG["style_file"])

        # 교체할 모든 설정값을 하나의 딕셔너리로 통합
        replacements = {
            **{f"{{{{{k}}}}}": v for k, v in COLOR_CONFIG.items()},
            **{f"{{{{{k}_size}}}}": v for k, v in FONT_CONFIG.items()},
            "{{page_width}}": str(OUTPUT_CONFIG["page_width"]),
            "{{page_height}}": str(OUTPUT_CONFIG["page_height"]),
        }

        # 딕셔너리를 순회하며 모든 플레이스홀더 교체
        customized_css = base_css
        for placeholder, value in replacements.items():
            customized_css = customized_css.replace(placeholder, value)

        return customized_css

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
            
            image_dir = PATH_CONFIG["image_dir"]
            for i, page_element in enumerate(pages, 1):
                if OUTPUT_CONFIG.get("generate_png", True):
                    png_path = os.path.join(image_dir, f"geek_page_{i:02d}.png")
                    await page_element.screenshot(
                        path=png_path, 
                        type='png', 
                        omit_background=False
                    )
                    print(f"  └─ PNG 생성 완료: {png_path}")

                if OUTPUT_CONFIG.get("generate_jpg", True):
                    jpg_path = os.path.join(image_dir, f"geek_page_{i:02d}.jpg")
                    await page_element.screenshot(
                        path=jpg_path, 
                        type='jpeg', 
                        quality=OUTPUT_CONFIG.get("image_quality", 95),
                        omit_background=False
                    )
                    print(f"  └─ JPG 생성 완료: {jpg_path}")
            
            await browser.close()
            print("[이미지 생성] 개별 페이지 이미지 생성 완료\n")

    async def generate_combined_image(self, news_items):
        print("[통합 이미지 생성] 시작...")
        combined_template = self.load_template("combined_template.html")
        
        html_content = await self.create_html(news_items)
        
        full_html = combined_template.replace('{all_pages_content}', html_content)
        
        async with async_playwright() as p:
            print("[통합 이미지 생성] 브라우저 시작 중...")
            browser = await p.chromium.launch(headless=True)
            
            num_news_pages = (len(news_items) + 1) // 2
            total_pages = 2 + num_news_pages
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