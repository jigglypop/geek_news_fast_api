import React, { useRef } from 'react';
import { Type, Image, Square, Circle } from 'lucide-react';
import type { DraggableElement } from '../types';

interface ElementToolbarProps {
  onAddElement: (element: Omit<DraggableElement, 'id'>) => void;
}

const ElementToolbar: React.FC<ElementToolbarProps> = ({ onAddElement }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddText = () => {
    onAddElement({
      type: 'text',
      position: { x: 100, y: 100 },
      size: { width: 150, height: 50 },
      content: '새 텍스트',
      fontSize: 16,
      color: '#000000',
      zIndex: Date.now()
    });
  };

  const handleAddShape = (shapeType: 'rectangle' | 'circle') => {
    onAddElement({
      type: 'shape',
      position: { x: 150, y: 150 },
      size: { width: 100, height: 100 },
      backgroundColor: '#007bff',
      zIndex: Date.now()
    });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      onAddElement({
        type: 'image',
        position: { x: 200, y: 200 },
        size: { width: 200, height: 150 },
        imageUrl,
        zIndex: Date.now()
      });
    };
    reader.readAsDataURL(file);
  };

  const handleAddImage = () => {
    fileInputRef.current?.click();
  };

  const buttonClass = "flex flex-col items-center justify-center gap-1.5 p-3 border border-gray-600 rounded-lg bg-gray-700 cursor-pointer transition-all text-sm font-medium text-gray-300 w-20 h-20 hover:bg-gray-600 hover:text-white hover:border-gray-500 active:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const iconClass = "w-6 h-6";

  return (
    <div className="flex gap-3 p-3 bg-gray-800 rounded-lg mb-4 flex-wrap justify-center">
      <button 
        onClick={handleAddText}
        className={buttonClass}
      >
        <Type className={iconClass} />
        <span>텍스트</span>
      </button>
      
      <button 
        onClick={handleAddImage}
        className={buttonClass}
      >
        <Image className={iconClass} />
        <span>이미지</span>
      </button>
      
      <button 
        onClick={() => handleAddShape('rectangle')}
        className={buttonClass}
      >
        <Square className={iconClass} />
        <span>사각형</span>
      </button>
      
      <button 
        onClick={() => handleAddShape('circle')}
        className={buttonClass}
      >
        <Circle className={iconClass} />
        <span>원형</span>
      </button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  );
};

export default ElementToolbar; 