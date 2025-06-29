import os
import asyncio
from bs4 import BeautifulSoup
from transformers import T5ForConditionalGeneration, AutoTokenizer
import torch
from config import CRAWLING_CONFIG, AI_CONFIG
from dotenv import load_dotenv
import httpx
import openai

load_dotenv()

class NewsFetcher:
    def __init__(self, api_type="huggingface"):
        self.api_type = api_type
        if api_type == "huggingface":
            self._init_huggingface_model()
        elif api_type == "openai":
            self._init_openai_client()
        else:
            raise ValueError(f"지원하지 않는 API 타입: {api_type}")

    def _init_huggingface_model(self):
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

    def _init_openai_client(self):
        print("OpenAI API 초기화 중...")
        self.openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        print("✓ OpenAI API 초기화 완료")

    async def _summarize_text(self, text):
        if not text or len(text.strip()) < 50:
            return ""
        if self.api_type == "huggingface":
            return await self._summarize_with_huggingface(text)
        elif self.api_type == "openai":
            return await self._summarize_with_openai(text)
        return "지원하지 않는 API 타입입니다."

    async def _summarize_with_huggingface(self, text):
        print(f"  [HF 요약 원문] {text[:150]}...")
        try:
            # Note: The prompt template logic is removed as it's a frontend concern now.
            # A simple instruction is prepended instead.
            input_text = f"다음 내용을 한국어로 요약해 주세요: {text}"
            inputs = self.tokenizer(
                input_text,
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
            print(f"  [HF 요약 성공] {summary.strip()}")
            return summary.strip()
        except Exception as e:
            print(f"  [HF 요약 실패] 오류: {e}")
            return "요약 생성에 실패했습니다."

    async def _summarize_with_openai(self, text):
        print(f"  [OpenAI 요약 원문] {text[:150]}...")
        try:
            response = await asyncio.to_thread(
                self.openai_client.chat.completions.create,
                model="gpt-4-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that summarizes Korean news articles concisely."},
                    {"role": "user", "content": f"다음 뉴스를 한국어로 요약해줘: {text}"}
                ]
            )
            summary = response.choices[0].message.content
            print(f"  [OpenAI 요약 성공] {summary.strip()}")
            return summary.strip()
        except Exception as e:
            print(f"[에러] OpenAI 요약 실패: {e}")
            return ""

    async def _get_detail(self, topic_id):
        try:
            async with httpx.AsyncClient() as client:
                url = f'https://news.hada.io/topic?id={topic_id}'
                response = await client.get(url, timeout=CRAWLING_CONFIG["timeout"])
                soup = BeautifulSoup(response.text, 'lxml')
                contents_elem = soup.find('div', class_='topic_contents')
                if contents_elem:
                    return contents_elem.get_text(separator=' ', strip=True)
                desc_elem = soup.find('div', class_='topic_desc')
                return desc_elem.get_text(strip=True) if desc_elem else ""
        except Exception as e:
            print(f"긱뉴스 상세 정보 가져오기 실패: {e}")
            return ""

    async def fetch_news(self):
        print(f"\nGeekNews 크롤링 및 요약 시작 (API: {self.api_type})...")
        async with httpx.AsyncClient(timeout=CRAWLING_CONFIG["timeout"]) as client:
            try:
                response = await client.get(CRAWLING_CONFIG["base_url"])
                response.raise_for_status()
            except httpx.RequestError as e:
                print(f"[에러] GeekNews 페이지를 가져올 수 없습니다: {e}")
                return []

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
                if original_link and original_link.startswith('/'):
                    original_link = f"https://news.hada.io{original_link}"
                
                topic_id = None
                geeknews_link = ""
                all_links = topic.find_all('a')
                for link in all_links:
                    href = link.get('href', '')
                    if 'topic?id=' in href:
                        try:
                            topic_id = href.split('id=')[-1].split('&')[0]
                            geeknews_link = f"https://news.hada.io{href}"
                            break
                        except:
                            pass
                
                desc_elem = topic.find('span', class_='topicdesc')
                desc = desc_elem.text.strip() if desc_elem else ''
                
                if topic_id:
                    detailed_desc = await self._get_detail(topic_id)
                    if detailed_desc and len(detailed_desc) > len(desc):
                        desc = detailed_desc

                summarized_desc = await self._summarize_text(desc)
                
                news_items.append({
                    'id': topic_id or f"item-{len(news_items)}",
                    'title': title,
                    'description': summarized_desc if summarized_desc else "요약 정보가 없습니다.",
                    'source_url': original_link,
                    'discussion_url': geeknews_link,
                })
            
            print(f"✓ 뉴스 {len(news_items)}개 크롤링 및 요약 완료.")
            return news_items 