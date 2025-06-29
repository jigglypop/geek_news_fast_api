import React from 'react';
import type { DraggableElement } from '../types';
import ColorPicker from './ColorPicker';
import { Trash2 } from 'lucide-react';
import { useElementStore } from '../store/elementStore';

interface ElementPropertiesProps {
  element: DraggableElement | null;
  onUpdateElement: (element: DraggableElement) => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-4">
    <h5 className="text-sm font-semibold text-gray-300 mb-2">{title}</h5>
    <div className="bg-gray-700 rounded-md p-3">{children}</div>
  </div>
);

const LabeledInput: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block mb-1.5 text-xs font-medium text-gray-400">{label}</label>
    {children}
  </div>
);

const baseInputStyles = "w-full px-3 py-2 border border-gray-600 bg-gray-800 text-white rounded-md text-base focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

const ElementProperties: React.FC<ElementPropertiesProps> = ({ element, onUpdateElement }) => {
  const deleteElement = useElementStore((state) => state.deleteElement);
  
  if (!element) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 mt-4 border border-gray-700">
        <h4 className="text-base font-semibold mb-2 text-gray-100">요소 속성</h4>
        <p className="text-sm text-gray-400 italic">
          요소를 선택하면 속성을 편집할 수 있습니다.
        </p>
      </div>
    );
  }

  const updateElement = (updates: Partial<DraggableElement>) => {
    onUpdateElement({ ...element, ...updates });
  };

  const getElementTypeName = () => {
    switch (element.type) {
      case 'text': return '텍스트';
      case 'image': return '이미지';
      case 'container': return '컨테이너';
      default: return '요소';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 mt-4 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-base font-semibold text-gray-100">
          {getElementTypeName()} 속성
        </h4>
        <button
          onClick={() => deleteElement(element.id)}
          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-md transition-colors"
          title="요소 삭제"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      <Section title="위치 & 크기">
        <div className="grid grid-cols-2 gap-3">
          <LabeledInput label="X 좌표">
            <input
              type="number"
              value={element.position.x}
              onChange={(e) => updateElement({ position: { ...element.position, x: Number(e.target.value) } })}
              className={baseInputStyles}
            />
          </LabeledInput>
          <LabeledInput label="Y 좌표">
            <input
              type="number"
              value={element.position.y}
              onChange={(e) => updateElement({ position: { ...element.position, y: Number(e.target.value) } })}
              className={baseInputStyles}
            />
          </LabeledInput>
          <LabeledInput label="너비">
            <input
              type="number"
              value={element.size.width}
              onChange={(e) => updateElement({ size: { ...element.size, width: Number(e.target.value) } })}
              className={baseInputStyles}
            />
          </LabeledInput>
          <LabeledInput label="높이">
            <input
              type="number"
              value={element.size.height}
              onChange={(e) => updateElement({ size: { ...element.size, height: Number(e.target.value) } })}
              className={baseInputStyles}
            />
          </LabeledInput>
        </div>
      </Section>

      {element.type === 'text' && (
        <>
          <Section title="콘텐츠">
            <LabeledInput label="내용">
              <textarea
                value={element.content || ''}
                onChange={(e) => updateElement({ content: e.target.value })}
                placeholder="텍스트 내용"
                className={`${baseInputStyles} min-h-16 resize-y`}
              />
            </LabeledInput>
          </Section>
          
          <Section title="폰트">
            <div className="grid grid-cols-2 gap-3">
              <LabeledInput label="글꼴">
                <select
                  value={element.fontFamily || 'Pretendard'}
                  onChange={(e) => updateElement({ fontFamily: e.target.value as 'Pretendard' | 'BlackHanSans' })}
                  className={baseInputStyles}
                >
                  <option value="Pretendard">Pretendard</option>
                  <option value="BlackHanSans">BlackHanSans</option>
                </select>
              </LabeledInput>
              <LabeledInput label="크기">
                <input
                  type="number"
                  value={element.fontSize || 16}
                  onChange={(e) => updateElement({ fontSize: Number(e.target.value) })}
                  min="8"
                  max="200"
                  className={baseInputStyles}
                />
              </LabeledInput>
            </div>
          </Section>
          
          <Section title="정렬 및 변환">
             <div className="grid grid-cols-2 gap-3">
                <LabeledInput label="가로 정렬">
                  <select
                    value={element.textAlign || 'left'}
                    onChange={(e) => updateElement({ textAlign: e.target.value as DraggableElement['textAlign'] })}
                    className={baseInputStyles}
                  >
                    <option value="left">왼쪽</option>
                    <option value="center">가운데</option>
                    <option value="right">오른쪽</option>
                  </select>
                </LabeledInput>
            </div>
          </Section>

          <Section title="색상">
            <div className="grid grid-cols-2 gap-3">
              <ColorPicker
                color={element.color || '#000000'}
                onChange={(color) => updateElement({ color })}
                label="텍스트 색상"
              />
              <ColorPicker
                color={element.backgroundColor || 'transparent'}
                onChange={(backgroundColor) => updateElement({ backgroundColor })}
                label="배경 색상"
              />
            </div>
          </Section>
        </>
      )}

      {element.type === 'image' && (
        <Section title="이미지">
          <LabeledInput label="이미지 URL">
            <input
              type="text"
              value={element.imageUrl || ''}
              onChange={(e) => updateElement({ imageUrl: e.target.value })}
              placeholder="https://example.com/image.png"
              className={baseInputStyles}
            />
          </LabeledInput>
        </Section>
      )}

      {element.type === 'container' && (
        <>
          <Section title="채우기">
            <ColorPicker
              color={element.backgroundColor || 'transparent'}
              onChange={(backgroundColor) => updateElement({ backgroundColor })}
              label="배경 색상"
            />
          </Section>
          <Section title="테두리">
            <div className="grid grid-cols-2 gap-3">
              <LabeledInput label="두께 (px)">
                <input
                  type="number"
                  value={element.borderWidth || 0}
                  onChange={(e) => updateElement({ borderWidth: Number(e.target.value) })}
                  min="0"
                  className={baseInputStyles}
                />
              </LabeledInput>
              <LabeledInput label="반경 (px)">
                <input
                  type="number"
                  value={element.borderRadius || 0}
                  onChange={(e) => updateElement({ borderRadius: Number(e.target.value) })}
                  min="0"
                  className={baseInputStyles}
                />
              </LabeledInput>
            </div>
            <div className="mt-3">
              <ColorPicker
                color={element.borderColor || '#000000'}
                onChange={(borderColor) => updateElement({ borderColor })}
                label="테두리 색상"
              />
            </div>
          </Section>
          <Section title="효과">
            <LabeledInput label="그림자">
              <input
                type="text"
                value={element.boxShadow || ''}
                onChange={(e) => updateElement({ boxShadow: e.target.value })}
                placeholder="e.g., 0 10px 15px rgba(0,0,0,0.1)"
                className={baseInputStyles}
              />
            </LabeledInput>
            <LabeledInput label="Backdrop Filter">
              <input
                type="text"
                value={element.backdropFilter || ''}
                onChange={(e) => updateElement({ backdropFilter: e.target.value })}
                placeholder="e.g., blur(10px)"
                className={baseInputStyles}
              />
            </LabeledInput>
          </Section>
        </>
      )}
    </div>
  );
};

export default ElementProperties; 