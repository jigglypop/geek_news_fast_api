import React from 'react';
import { Download, Save, Eye, FileText, BarChart3, RefreshCw } from 'lucide-react';
import type { Theme } from '../types';
import { THEME_PRESETS } from '../utils/themeGenerator';

interface ToolbarProps {
  theme: Theme;
  previewMode: 'cover' | 'news' | 'summary';
  onPreviewModeChange: (mode: 'cover' | 'news' | 'summary') => void;
  onRefresh: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  theme, 
  previewMode, 
  onPreviewModeChange,
  onRefresh
}) => {

  const handleSave = () => {
    // This function might need reimplementation later
    console.log("Saving theme config:", theme);
  };

  const handleExport = () => {
    const themeJson = JSON.stringify(theme, null, 2);
    const blob = new Blob([themeJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `theme_${theme.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 text-white shadow-md">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-blackhan text-white">긱뉴스 디자이너</h1>
        <select
          className="px-3 py-1.5 border border-gray-600 rounded-md bg-gray-700 text-white text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={theme.id}
          // The onChange handler is disabled for now
          onChange={() => {}}
          disabled
        >
          {Object.entries(THEME_PRESETS).map(([id, preset]) => (
            <option key={id} value={id} className="bg-gray-700 text-white">
              {id.charAt(0).toUpperCase() + id.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <button
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors ${
            previewMode === 'cover' 
              ? 'bg-sky-500 text-white' 
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
          onClick={() => onPreviewModeChange('cover')}
        >
          <Eye className="w-4 h-4" />
          표지
        </button>
        
        <button
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors ${
            previewMode === 'news' 
              ? 'bg-sky-500 text-white'
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
          onClick={() => onPreviewModeChange('news')}
        >
          <FileText className="w-4 h-4" />
          뉴스
        </button>
        
        <button
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors ${
            previewMode === 'summary' 
              ? 'bg-sky-500 text-white'
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
          onClick={() => onPreviewModeChange('summary')}
        >
          <BarChart3 className="w-4 h-4" />
          요약
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-600 rounded-md bg-blue-600 text-white text-sm font-medium cursor-pointer transition-colors hover:bg-blue-500"
        >
          <RefreshCw className="w-4 h-4" />
          뉴스 새로고침
        </button>
        <button 
          onClick={handleSave}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-600 rounded-md bg-gray-700 text-white text-sm font-medium cursor-pointer transition-colors hover:bg-gray-600"
        >
          <Save className="w-4 h-4" />
          설정 저장 (미구현)
        </button>
        
        <button 
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-600 rounded-md bg-gray-700 text-white text-sm font-medium cursor-pointer transition-colors hover:bg-gray-600"
        >
          <Download className="w-4 h-4" />
          테마 내보내기
        </button>
      </div>
    </div>
  );
};

export default Toolbar; 