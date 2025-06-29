import React, { useState, useEffect } from 'react';
import ColorPicker from './ColorPicker';
import { parseGradient, createGradient } from '../utils/themeGenerator';

interface GradientEditorProps {
  gradient: string;
  onChange: (gradient: string) => void;
  label: string;
}

const GradientEditor: React.FC<GradientEditorProps> = ({ gradient, onChange, label }) => {
  const [colors, setColors] = useState<string[]>(['#000000', '#ffffff']);
  const [direction, setDirection] = useState('160deg');

  useEffect(() => {
    const parsed = parseGradient(gradient);
    setColors(parsed.colors);
    setDirection(parsed.direction);
  }, [gradient]);

  const updateGradient = (newColors: string[], newDirection: string) => {
    const newGradient = createGradient(newColors, newDirection);
    onChange(newGradient);
  };

  const handleColorChange = (index: number, color: string) => {
    const newColors = [...colors];
    newColors[index] = color;
    setColors(newColors);
    updateGradient(newColors, direction);
  };

  const handleDirectionChange = (newDirection: string) => {
    setDirection(newDirection);
    updateGradient(colors, newDirection);
  };

  return (
    <div className="mb-6">
      <label className="block mb-3 text-base font-semibold text-gray-800">
        {label}
      </label>
      <div 
        className="w-full h-15 rounded-lg border-2 border-gray-300 mb-4"
        style={{ background: gradient }}
      />
      
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <ColorPicker
            color={colors[0] || '#000000'}
            onChange={(color) => handleColorChange(0, color)}
            label="시작 색상"
          />
        </div>
        
        <div className="flex-1">
          <ColorPicker
            color={colors[1] || '#ffffff'}
            onChange={(color) => handleColorChange(1, color)}
            label="끝 색상"
          />
        </div>
        
        <div>
          <label className="block mb-2 text-sm font-medium text-gray-700">
            방향
          </label>
          <select
            className="px-3 py-2 border-2 border-gray-300 rounded-md text-sm bg-white min-w-30 focus:outline-none focus:border-blue-500"
            value={direction}
            onChange={(e) => handleDirectionChange(e.target.value)}
          >
            <option value="0deg">위로</option>
            <option value="90deg">오른쪽</option>
            <option value="180deg">아래로</option>
            <option value="270deg">왼쪽</option>
            <option value="45deg">우상향</option>
            <option value="135deg">우하향</option>
            <option value="225deg">좌하향</option>
            <option value="315deg">좌상향</option>
            <option value="160deg">기본</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default GradientEditor; 