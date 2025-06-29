import React, { useState } from 'react';
import { Palette, Edit } from 'lucide-react';
import type { Theme, DraggableElement } from '../types';
import { useElementStore } from '../store/elementStore';
import ColorPicker from './ColorPicker';
import GradientEditor from './GradientEditor';
import ElementToolbar from './ElementToolbar';
import ElementProperties from './ElementProperties';

interface PropertyPanelProps {
  theme?: Theme;
  onThemeChange?: (theme: Theme) => void;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({
  theme,
  onThemeChange,
}) => {
  const [activeTab, setActiveTab] = useState<'theme' | 'elements'>('elements');
  const elements = useElementStore((state) => state.elements);
  const selectedElement = useElementStore((state) => state.selectedElement);
  const setElements = useElementStore((state) => state.setElements);
  const updateElement = useElementStore((state) => state.updateElement);

  const updateTheme = (updates: Partial<Theme>) => {
    if (theme && onThemeChange) {
      onThemeChange({ ...theme, ...updates });
    }
  };

  const updateColors = (updates: Partial<Theme['colors']>) => {
    updateTheme({ colors: { ...theme.colors, ...updates } });
  };

  const updateFonts = (updates: Partial<Theme['fonts']>) => {
    updateTheme({ fonts: { ...theme.fonts, ...updates } });
  };

  const updateTexts = (updates: Partial<Theme['texts']>) => {
    updateTheme({ texts: { ...theme.texts, ...updates } });
  };

  const handleAddElement = (elementData: Omit<DraggableElement, 'id'>) => {
    const newElement: DraggableElement = {
      ...elementData,
      id: `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    setElements([...elements, newElement]);
  };

  const selectedElementData = selectedElement
    ? elements.find(el => el.id === selectedElement) || null
    : null;

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <div className="mb-4">
        <div className="flex rounded-lg bg-gray-700 p-1">
          <button
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'elements' 
                ? 'bg-gray-600 text-white shadow-sm' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
            onClick={() => setActiveTab('elements')}
          >
            <Edit className="w-4 h-4" />
            요소 편집
          </button>
          {theme && (
            <button
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'theme' 
                  ? 'bg-gray-600 text-white shadow-sm' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              onClick={() => setActiveTab('theme')}
            >
              <Palette className="w-4 h-4" />
              테마 설정
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'elements' ? (
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">요소 추가</h3>
            <ElementToolbar onAddElement={handleAddElement} />
            <ElementProperties 
              element={selectedElementData}
              onUpdateElement={updateElement}
            />
          </div>
        ) : theme ? (
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">테마 설정</h3>
            
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-base font-semibold mb-3 text-gray-100">배경 색상</h4>
                
                <GradientEditor
                  gradient={theme.colors.cover_background}
                  onChange={(gradient) => updateColors({ cover_background: gradient })}
                  label="표지 배경"
                />
                
                <GradientEditor
                  gradient={theme.colors.news_background}
                  onChange={(gradient) => updateColors({ news_background: gradient })}
                  label="뉴스 배경"
                />
                
                <GradientEditor
                  gradient={theme.colors.summary_background}
                  onChange={(gradient) => updateColors({ summary_background: gradient })}
                  label="요약 배경"
                />
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-base font-semibold mb-3 text-gray-100">텍스트 색상</h4>
                
                <ColorPicker
                  color={theme.colors.text_primary}
                  onChange={(color) => updateColors({ text_primary: color })}
                  label="주 텍스트"
                />
                
                <ColorPicker
                  color={theme.colors.text_secondary}
                  onChange={(color) => updateColors({ text_secondary: color })}
                  label="보조 텍스트"
                />
                
                <ColorPicker
                  color={theme.colors.text_accent}
                  onChange={(color) => updateColors({ text_accent: color })}
                  label="강조 텍스트"
                />
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-base font-semibold mb-3 text-gray-100">폰트 설정</h4>
                
                <div className="mb-4">
                  <label className="block mb-2 text-sm font-medium text-gray-300">제목 폰트</label>
                  <select
                    value={theme.fonts.title_font}
                    onChange={(e) => updateFonts({ title_font: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="BlackHanSans">BlackHanSans (한글 제목용)</option>
                    <option value="Pretendard">Pretendard (범용)</option>
                  </select>
                </div>
                
                <div className="mb-4">
                  <label className="block mb-2 text-sm font-medium text-gray-300">본문 폰트</label>
                  <select
                    value={theme.fonts.body_font}
                    onChange={(e) => updateFonts({ body_font: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="Pretendard">Pretendard (추천)</option>
                    <option value="BlackHanSans">BlackHanSans</option>
                  </select>
                </div>
                
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block mb-2 text-sm font-medium text-gray-300">제목 크기</label>
                    <input
                      type="number"
                      value={theme.fonts.title_size}
                      onChange={(e) => updateFonts({ title_size: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md text-sm focus:outline-none focus:border-blue-500"
                      min="16"
                      max="72"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <label className="block mb-2 text-sm font-medium text-gray-300">본문 크기</label>
                    <input
                      type="number"
                      value={theme.fonts.body_size}
                      onChange={(e) => updateFonts({ body_size: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md text-sm focus:outline-none focus:border-blue-500"
                      min="8"
                      max="32"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-base font-semibold mb-3 text-gray-100">텍스트 내용</h4>
                
                <div className="mb-4">
                  <label className="block mb-2 text-sm font-medium text-gray-300">제목</label>
                  <input
                    type="text"
                    value={theme.texts.title}
                    onChange={(e) => updateTexts({ title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md text-sm focus:outline-none focus:border-blue-500"
                    placeholder="GeekNews"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block mb-2 text-sm font-medium text-gray-300">부제목</label>
                  <input
                    type="text"
                    value={theme.texts.subtitle}
                    onChange={(e) => updateTexts({ subtitle: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md text-sm focus:outline-none focus:border-blue-500"
                    placeholder="개발자를 위한 기술 뉴스"
                  />
                </div>
                
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-300">날짜 형식</label>
                  <input
                    type="text"
                    value={theme.texts.date_format}
                    onChange={(e) => updateTexts({ date_format: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md text-sm focus:outline-none focus:border-blue-500"
                    placeholder="%Y년 %m월 %d일"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PropertyPanel; 