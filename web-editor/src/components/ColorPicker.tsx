import React, { useState } from 'react';
import { ChromePicker } from 'react-color';
import type { ColorPickerProps } from '../types';

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange, label }) => {
  const [showPicker, setShowPicker] = useState(false);

  const handleColorChange = (colorResult: any) => {
    onChange(colorResult.hex);
  };

  return (
    <div className="relative mb-4">
      <label className="block mb-2 text-sm font-medium text-gray-300">
        {label}
      </label>
      <button
        style={{ background: color }}
        onClick={() => setShowPicker(!showPicker)}
        className="w-full h-10 border-2 border-gray-600 rounded-lg cursor-pointer transition-colors hover:border-gray-500 focus:outline-none focus:border-blue-500"
        type="button"
      />
      {showPicker && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setShowPicker(false)} 
          />
          <div className="absolute top-12 left-0 z-50 bg-white rounded-lg shadow-lg">
            <ChromePicker
              color={color}
              onChange={handleColorChange}
              disableAlpha
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ColorPicker; 