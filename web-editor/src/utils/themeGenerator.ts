import type { Theme, NewsItem } from '../types';

export const THEME_PRESETS: Record<string, Omit<Theme, 'id' | 'name'>> = {
  default: {
    colors: {
      cover_background: 'linear-gradient(160deg, #FF5F6D 0%, #FFC371 100%)',
      news_background: 'linear-gradient(160deg, #FF5F6D 0%, #FFC371 100%)',
      summary_background: 'linear-gradient(160deg, #FF5F6D 0%, #FFC371 100%)',
      text_primary: '#FFFFFF',
      text_secondary: 'rgba(255, 255, 255, 0.9)',
      text_accent: '#FF5F6D',
    },
    fonts: {
      title_font: 'BlackHanSans',
      body_font: 'Pretendard',
      cover_title: 120,
      cover_subtitle: 32,
      news_title: 48,
      news_description: 32,
      news_category: 24,
      news_number: 40,
      link_text: 20,
      summary_title: 72,
      summary_subtitle: 36,
      summary_item_title: 22,
    },
    texts: {
      cover_title: '모드뉴스',
      cover_subtitle: '모여봐요 개발자와 AI의 숲',
      summary_title: 'GeekNews 요약',
      summary_subtitle: '오늘의 주요 뉴스',
      summary_footer_text: '총 {count}개의 뉴스를 확인했어요',
      summary_source: '출처: GeekNews (news.hada.io)',
    },
  },
  purple: {
    // Purple theme settings...
    colors: {
      cover_background: 'linear-gradient(160deg, #667eea 0%, #764ba2 100%)',
      news_background: 'linear-gradient(160deg, #667eea 0%, #764ba2 100%)',
      summary_background: 'linear-gradient(160deg, #667eea 0%, #764ba2 100%)',
      text_primary: '#FFFFFF',
      text_secondary: 'rgba(255, 255, 255, 0.9)',
      text_accent: '#764ba2',
    },
    fonts: {
      title_font: 'BlackHanSans',
      body_font: 'Pretendard',
      cover_title: 110,
      cover_subtitle: 30,
      news_title: 46,
      news_description: 30,
      news_category: 22,
      news_number: 38,
      link_text: 18,
      summary_title: 70,
      summary_subtitle: 34,
      summary_item_title: 20,
    },
    texts: {
      cover_title: '퍼플뉴스',
      cover_subtitle: '신비로운 개발의 세계',
      summary_title: 'GeekNews 요약',
      summary_subtitle: '오늘의 주요 뉴스',
      summary_footer_text: '총 {count}개의 뉴스를 확인했어요',
      summary_source: '출처: GeekNews (news.hada.io)',
    },
  },
};

export const defaultTheme: Theme = {
  id: 'default',
  name: 'Default',
  ...THEME_PRESETS.default,
  images: {
    character: '/image/character/1.png',
    qr_code: '/image/QR.png',
  }
};

export const generatePythonConfig = (theme: Theme): string => {
  return `# 테마 프리셋 - ${theme.name}
THEME_PRESETS = {
    "${theme.id}": {
        "colors": {
            "cover_background": "${theme.colors.cover_background}",
            "news_background": "${theme.colors.news_background}",
            "summary_background": "${theme.colors.summary_background}",
            "end_background": "${theme.colors.end_background}"
        },
        "fonts": {
            "cover_title": "${theme.fonts.cover_title}",
            "cover_subtitle": "${theme.fonts.cover_subtitle}",
            "news_title": "${theme.fonts.news_title}",
            "news_description": "${theme.fonts.news_description}",
            "news_category": "${theme.fonts.news_category}",
            "news_number": "${theme.fonts.news_number}",
            "link_text": "${theme.fonts.link_text}",
            "summary_title": "${theme.fonts.summary_title}",
            "summary_subtitle": "${theme.fonts.summary_subtitle}",
            "summary_item_title": "${theme.fonts.summary_item_title}"
        },
        "texts": {
            "cover_subtitle": "${theme.texts.cover_subtitle}",
            "cover_title": "${theme.texts.cover_title}",
            "news_card_prefix": "${theme.texts.news_card_prefix}"
        }
    }
}`;
};

export const parseGradient = (gradient: string): { colors: string[], direction: string } => {
  const match = gradient.match(/linear-gradient\(([^,]+),\s*([^)]+)\)/);
  if (!match) return { colors: ['#000000', '#ffffff'], direction: '160deg' };
  
  const direction = match[1].trim();
  const colorStops = match[2].split(',').map(stop => {
    const colorMatch = stop.trim().match(/#[0-9a-fA-F]{6}/);
    return colorMatch ? colorMatch[0] : '#000000';
  });
  
  return { colors: colorStops, direction };
};

export const createGradient = (colors: string[], direction: string = '160deg'): string => {
  const colorStops = colors.map((color, index) => {
    const percentage = index === 0 ? '0%' : '100%';
    return `${color} ${percentage}`;
  }).join(', ');
  
  return `linear-gradient(${direction}, ${colorStops})`;
}; 