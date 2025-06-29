import { useMemo, useEffect, useCallback, useState } from 'react';
import type { Theme, DraggableElement, NewsItem } from '../types';
import { defaultTheme } from '../utils/themeGenerator';
import Toolbar from './Toolbar';
import PropertyPanel from './PropertyPanel';
import DraggableCanvas from './DraggableCanvas';
import SaveLoadPanel from './SaveLoadPanel';
import ExportPanel from './ExportPanel';
import { useElementStore } from '../store/elementStore';

const createElementsFromNews = (theme: Theme, newsItems: NewsItem[]): Record<'cover' | 'news' | 'summary', DraggableElement[]> => {
  const coverElements: DraggableElement[] = [
    {
      id: 'cover_subtitle',
      type: 'text',
      content: theme.texts.cover_subtitle,
      position: { x: 60, y: 180 },
      size: { width: 960, height: 50 },
      color: 'rgba(255, 255, 255, 0.9)',
      fontSize: theme.fonts.cover_subtitle,
      fontFamily: theme.fonts.body_font,
      textAlign: 'center',
      zIndex: 2,
    },
    {
      id: 'cover_title',
      type: 'text',
      content: theme.texts.cover_title,
      position: { x: 60, y: 300 },
      size: { width: 960, height: 250 },
      color: 'rgba(255, 255, 255, 0.95)',
      fontSize: theme.fonts.cover_title,
      fontFamily: theme.fonts.title_font,
      textAlign: 'center',
      zIndex: 1,
    },
    {
      id: 'character_image',
      type: 'image',
      imageUrl: theme.images.character,
      position: { x: 315, y: 500 },
      size: { width: 450, height: 450 },
      zIndex: 3,
    },
    {
      id: 'qr_code',
      type: 'image',
      imageUrl: theme.images.qr_code,
      position: { x: 870, y: 60 },
      size: { width: 150, height: 150 },
      zIndex: 4,
    },
  ];

  const newsPages = newsItems.map((news, index) => {
    return [
      { id: `news_topic_category_bg_${index}`, type: 'container', position: { x: 420, y: 80 }, size: { width: 240, height: 50 }, backgroundColor: 'white', borderRadius: 25, zIndex: 2 },
      { id: `news_topic_category_text_${index}`, type: 'text', content: '개발', position: { x: 420, y: 92 }, size: { width: 240, height: 30 }, color: '#FF5F6D', fontSize: theme.fonts.news_category, fontFamily: theme.fonts.body_font, textAlign: 'center', zIndex: 3, },
      { id: `news_page_number_${index}`, type: 'text', content: `GeekNews #${index + 1}`, position: { x: 60, y: 150 }, size: { width: 960, height: 50 }, color: 'white', fontSize: theme.fonts.news_number, fontFamily: theme.fonts.title_font, textAlign: 'center', zIndex: 2, },
      { id: `news_title_${index}`, type: 'text', content: news.title, position: { x: 80, y: 220 }, size: { width: 920, height: 100 }, color: 'rgba(255, 255, 255, 0.9)', fontSize: theme.fonts.news_title, textAlign: 'center', fontFamily: theme.fonts.title_font, zIndex: 2, },
      { id: `news_body_container_${index}`, type: 'container', position: { x: 80, y: 340 }, size: { width: 920, height: 450 }, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 20, backdropFilter: 'blur(18px)', zIndex: 1, },
      { id: `news_description_${index}`, type: 'text', content: news.description, position: { x: 130, y: 390 }, size: { width: 820, height: 350 }, color: '#333', fontSize: theme.fonts.news_description, fontFamily: theme.fonts.body_font, zIndex: 2, },
      { id: `links_section_${index}`, type: 'container', position: { x: 80, y: 810 }, size: { width: 920, height: 120 }, backgroundColor: 'rgba(255, 255, 255, 0.3)', borderRadius: 15, zIndex: 1, },
      { id: `links_content_${index}`, type: 'text', content: `토론: ${news.discussion_url}\n원문: ${news.source_url}`, position: { x: 100, y: 830 }, size: { width: 880, height: 80 }, color: '#333', fontSize: theme.fonts.link_text, fontFamily: theme.fonts.body_font, zIndex: 2, },
      { id: `news_character_image_${index}`, type: 'image', imageUrl: theme.images.character, position: { x: 800, y: 700 }, size: { width: 250, height: 250 }, zIndex: 3, },
    ];
  });
  
  const summaryElements: DraggableElement[] = [
    { id: 'summary_card_container', type: 'container', position: { x: 60, y: 60 }, size: { width: 960, height: 960 }, backgroundColor: 'rgba(255, 255, 255, 0.12)', borderRadius: 30, borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.35)', boxShadow: '0 20px 45px rgba(0,0,0,0.35)', backdropFilter: 'blur(22px)', zIndex: 1, },
    { id: 'summary_main_title', type: 'text', content: theme.texts.summary_title, position: { x: 80, y: 110 }, size: { width: 920, height: 80 }, color: 'white', fontSize: theme.fonts.summary_title, textAlign: 'center', fontFamily: theme.fonts.title_font, zIndex: 2, },
    { id: 'summary_date', type: 'text', content: new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }), position: { x: 80, y: 200 }, size: { width: 920, height: 40 }, color: 'rgba(255, 255, 255, 0.9)', fontSize: 24, textAlign: 'center', fontFamily: theme.fonts.body_font, zIndex: 2, },
    { id: 'summary_subtitle', type: 'text', content: theme.texts.summary_subtitle, position: { x: 80, y: 280 }, size: { width: 920, height: 40 }, color: 'white', fontSize: theme.fonts.summary_subtitle, textAlign: 'center', fontFamily: theme.fonts.title_font, zIndex: 2, },
    ...newsItems.flatMap((news, i) => ([
      { id: `summary_item_container_${i}`, type: 'container' as const, position: { x: 110, y: 360 + i * 125 }, size: { width: 860, height: 110 }, backgroundColor: 'rgba(255, 255, 255, 0.18)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', backdropFilter: 'blur(18px)', zIndex: 2, },
      { id: `summary_item_number_bg_${i}`, type: 'container' as const, position: { x: 135, y: 395 + i * 125 }, size: { width: 40, height: 40 }, backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 20, zIndex: 4, },
      { id: `summary_item_number_text_${i}`, type: 'text' as const, content: `${i + 1}`, position: { x: 135, y: 400 + i * 125 }, size: { width: 40, height: 30 }, color: '#333', fontSize: 18, textAlign: 'center', fontFamily: theme.fonts.title_font, zIndex: 5, },
      { id: `summary_item_category_bg_${i}`, type: 'container' as const, position: { x: 190, y: 395 + i * 125 }, size: { width: 80, height: 40 }, backgroundColor: 'rgba(255, 255, 255, 0.25)', borderRadius: 15, backdropFilter: 'blur(10px)', zIndex: 3, },
      { id: `summary_item_category_text_${i}`, type: 'text' as const, content: '뉴스', position: { x: 190, y: 402 + i * 125 }, size: { width: 80, height: 25 }, color: 'white', fontSize: 14, textAlign: 'center', fontFamily: theme.fonts.body_font, zIndex: 4, },
      { id: `summary_item_title_${i}`, type: 'text' as const, content: news.title, position: { x: 280, y: 380 + i * 125 }, size: { width: 680, height: 80 }, color: 'white', fontSize: theme.fonts.summary_item_title, fontFamily: theme.fonts.body_font, textAlign: 'left', zIndex: 3, },
    ])),
    { id: 'summary_footer_divider', type: 'container', position: { x: 110, y: 360 + newsItems.length * 125 }, size: { width: 860, height: 2 }, backgroundColor: 'rgba(255, 255, 255, 0.3)', zIndex: 2, },
    { id: 'summary_footer_text', type: 'text', content: theme.texts.summary_footer_text.replace('{count}', String(newsItems.length)), position: { x: 80, y: 380 + newsItems.length * 125 }, size: { width: 920, height: 30 }, color: 'rgba(255, 255, 255, 0.95)', fontSize: 20, textAlign: 'center', fontFamily: theme.fonts.body_font, zIndex: 2, },
    { id: 'summary_source_text', type: 'text', content: theme.texts.summary_source, position: { x: 80, y: 420 + newsItems.length * 125 }, size: { width: 920, height: 30 }, color: 'rgba(255, 255, 255, 0.8)', fontSize: 18, textAlign: 'center', fontFamily: theme.fonts.body_font, zIndex: 2, },
  ];

  return {
    cover: coverElements,
    news: newsPages.length > 0 ? newsPages[0] : [],
    summary: summaryElements,
  };
};

const Editor = () => {
  const { 
    elements, 
    selectedElement, 
    setElements, 
    selectElement, 
    updateElement 
  } = useElementStore();

  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'cover' | 'news' | 'summary'>('cover');

  const elementsByMode = useMemo(() => {
    return createElementsFromNews(theme, newsItems);
  }, [theme, newsItems]);

  const fetchNews = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = `http://localhost:8000/api/news${forceRefresh ? '?force_refresh=true' : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('뉴스 정보를 불러오는 데 실패했습니다.');
      }
      const data: NewsItem[] = await response.json();
      setNewsItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류 발생');
      setNewsItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  useEffect(() => {
    setElements(elementsByMode[previewMode] || []);
  }, [previewMode, elementsByMode, setElements]);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  const handlePreviewModeChange = (mode: 'cover' | 'news' | 'summary') => {
    setPreviewMode(mode);
    selectElement(null);
  };

  const getCurrentBackground = () => {
    switch (previewMode) {
      case 'cover': return theme.colors.cover_background;
      case 'news': return theme.colors.news_background;
      case 'summary': return theme.colors.summary_background;
      default: return theme.colors.cover_background;
    }
  };

  if (isLoading) {
    return <div className="w-screen h-screen flex items-center justify-center bg-gray-900 text-white">뉴스 데이터를 불러오는 중...</div>;
  }

  return (
    <div className="w-screen h-screen flex flex-col font-pretendard bg-gray-800 text-white">
      <Toolbar
        theme={theme}
        previewMode={previewMode}
        onPreviewModeChange={handlePreviewModeChange}
        onRefresh={() => fetchNews(true)}
      />
      <div className="flex-1 flex flex-row overflow-hidden">
        <div className="w-80 h-full overflow-y-auto bg-gray-900 shadow-lg">
          <div className="p-4 space-y-4">
            <PropertyPanel />
            <SaveLoadPanel 
              newsData={newsItems}
              theme={theme}
              currentMode={previewMode}
            />
            <ExportPanel
              previewMode={previewMode}
              newsItems={newsItems}
              theme={theme}
            />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-5 bg-gray-800 overflow-auto">
          {error && <div className="absolute top-20 text-red-500 bg-red-100 p-4 rounded-md">Error: {error}</div>}
          <DraggableCanvas
            elements={elements}
            selectedElement={selectedElement}
            backgroundGradient={getCurrentBackground()}
          />
        </div>
      </div>
    </div>
  );
};

export default Editor; 