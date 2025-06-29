import { useState } from 'react';
import { useElementStore } from '../store/elementStore';

interface ExportPanelProps {
  previewMode: 'cover' | 'news' | 'summary';
  newsItems: any[];
  theme: any;
}

export default function ExportPanel({ previewMode, theme }: ExportPanelProps) {
  const { elements } = useElementStore();
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'png' | 'pdf' | 'html'>('png');
  const [message, setMessage] = useState<string | null>(null);

  const generateHTML = (pageType: string) => {
    const canvasElement = document.querySelector('.draggable-canvas') as HTMLElement;
    if (!canvasElement) return '';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { margin: 0; padding: 0; width: 1080px; height: 1080px; overflow: hidden; }
    .canvas { position: relative; width: 1080px; height: 1080px; background: ${getBackgroundByType(pageType)}; }
    .element { position: absolute; }
    .text-element { display: flex; align-items: center; justify-content: center; }
    .container-element { border-radius: var(--radius); background: var(--bg); border: var(--border); backdrop-filter: var(--backdrop); box-shadow: var(--shadow); }
  </style>
</head>
<body>
  <div class="canvas">
    ${elements.map(el => generateElementHTML(el)).join('')}
  </div>
</body>
</html>`;
    return htmlContent;
  };

  const getBackgroundByType = (type: string) => {
    switch (type) {
      case 'cover': return theme.colors.cover_background;
      case 'news': return theme.colors.news_background;
      case 'summary': return theme.colors.summary_background;
      default: return theme.colors.cover_background;
    }
  };

  const generateElementHTML = (element: any) => {
    const commonStyle = `
      left: ${element.position.x}px;
      top: ${element.position.y}px;
      width: ${element.size.width}px;
      height: ${element.size.height}px;
      z-index: ${element.zIndex || 1};
    `;

    if (element.type === 'text') {
      return `
        <div class="element text-element" style="${commonStyle} color: ${element.color}; font-size: ${element.fontSize}px; font-family: ${element.fontFamily}; text-align: ${element.textAlign};">
          ${element.content}
        </div>
      `;
    } else if (element.type === 'container') {
      return `
        <div class="element container-element" style="${commonStyle} --bg: ${element.backgroundColor}; --radius: ${element.borderRadius}px; --border: ${element.borderWidth || 0}px solid ${element.borderColor || 'transparent'}; --backdrop: ${element.backdropFilter || 'none'}; --shadow: ${element.boxShadow || 'none'};"></div>
      `;
    } else if (element.type === 'image') {
      return `
        <img class="element" src="${element.imageUrl}" style="${commonStyle}" />
      `;
    }
    return '';
  };

  const handleExport = async () => {
    setIsExporting(true);
    setMessage(null);

    try {
      const htmlContent = generateHTML(previewMode);
      
      const response = await fetch('http://localhost:8000/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html_content: htmlContent,
          page_type: previewMode,
          page_index: 0,
          export_format: exportFormat
        }),
      });

      if (!response.ok) {
        throw new Error('내보내기 실패');
      }

      const result = await response.json();
      setMessage(`내보내기 완료: ${result.filename}`);
    } catch (error) {
      setMessage('내보내기 실패');
      console.error('[ERROR] 내보내기 실패:', error);
    } finally {
      setIsExporting(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleExportAll = async () => {
    setIsExporting(true);
    setMessage(null);

    try {
      const modes: Array<'cover' | 'news' | 'summary'> = ['cover', 'news', 'summary'];
      
      for (const mode of modes) {
        const htmlContent = generateHTML(mode);
        
        await fetch('http://localhost:8000/api/export', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            html_content: htmlContent,
            page_type: mode,
            page_index: modes.indexOf(mode),
            export_format: 'png'
          }),
        });
      }

      const combineResponse = await fetch('http://localhost:8000/api/export/combine-images', {
        method: 'POST',
      });

      if (!combineResponse.ok) {
        throw new Error('이미지 결합 실패');
      }

      const result = await combineResponse.json();
      setMessage(`전체 내보내기 완료: ${result.filename}`);
    } catch (error) {
      setMessage('전체 내보내기 실패');
      console.error('[ERROR] 전체 내보내기 실패:', error);
    } finally {
      setIsExporting(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-4 text-white">내보내기</h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-300 block mb-2">형식 선택</label>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as 'png' | 'pdf' | 'html')}
            className="w-full bg-gray-700 text-white px-3 py-2 rounded"
          >
            <option value="png">PNG 이미지</option>
            <option value="pdf">PDF 문서</option>
            <option value="html">HTML 파일</option>
          </select>
        </div>

        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {isExporting ? '내보내는 중...' : '현재 페이지 내보내기'}
        </button>

        <button
          onClick={handleExportAll}
          disabled={isExporting || exportFormat !== 'png'}
          className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {isExporting ? '내보내는 중...' : '전체 페이지 내보내기 (PNG)'}
        </button>

        {message && (
          <div className={`text-center p-2 rounded text-sm ${
            message.includes('실패') 
              ? 'bg-red-600 text-white' 
              : 'bg-green-600 text-white'
          }`}>
            {message}
          </div>
        )}

        <div className="text-xs text-gray-400">
          <p>• PNG: 각 페이지를 이미지로 저장</p>
          <p>• PDF: 문서 형식으로 저장</p>
          <p>• HTML: 편집 가능한 웹 파일로 저장</p>
        </div>
      </div>
    </div>
  );
} 