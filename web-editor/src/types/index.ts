export interface NewsItem {
  id: string;
  title: string;
  description: string;
  source_url: string;
  discussion_url: string;
}

export interface Theme {
  id: string;
  name: string;
  colors: {
    cover_background: string;
    news_background: string;
    summary_background: string;
    text_primary: string;
    text_secondary: string;
    text_accent: string;
  };
  fonts: {
    title_font: string;
    body_font: string;
    title_size: number;
    body_size: number;
    cover_title: number;
    cover_subtitle: number;
    news_title: number;
    news_description: number;
    news_category: number;
    news_number: number;
    link_text: number;
    summary_title: number;
    summary_subtitle: number;
    summary_item_title: number;
  };
  texts: {
    title: string;
    subtitle: string;
    date_format: string;
    cover_title: string;
    cover_subtitle: string;
    summary_title: string;
    summary_subtitle: string;
    summary_footer_text: string;
    summary_source: string;
    news_card_prefix: string;
  };
  images: {
    character: string;
    qr_code: string;
  };
}

export interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface DraggableElement {
  id: string;
  type: 'text' | 'image' | 'container';
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  content?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  imageUrl?: string;
  backgroundColor?: string;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  boxShadow?: string;
  backdropFilter?: string;
}

export interface CanvasProps {
  elements: DraggableElement[];
  onElementsChange: (elements: DraggableElement[]) => void;
  selectedElement: string | null;
  onSelectElement: (id: string | null) => void;
} 