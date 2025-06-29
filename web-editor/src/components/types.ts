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
    };
    texts: {
        title: string;
        subtitle: string;
        date_format: string;
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

import type { motion } from 'framer-motion';

export type DraggableItemProps = {
    element: DraggableElement;
    children: React.ReactNode;
    isSelected: boolean;
    onSelect: (id: string | null) => void;
    onUpdate: (element: DraggableElement) => void;
} & Omit<React.ComponentProps<typeof motion.div>, 'onUpdate' | 'onSelect'>;