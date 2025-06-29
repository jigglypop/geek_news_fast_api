import { useState, useEffect } from 'react';
import { usePersistStore } from '../store/persistStore';
import { useElementStore } from '../store/elementStore';

interface SaveLoadPanelProps {
  newsData: any;
  theme: any;
  currentMode: 'cover' | 'news' | 'summary';
}

export default function SaveLoadPanel({ newsData, theme, currentMode }: SaveLoadPanelProps) {
  const { 
    saveToServer, 
    loadFromServer, 
    listServerStates,
    autoSaveEnabled,
    toggleAutoSave,
    lastSavedAt
  } = usePersistStore();
  
  const { elements } = useElementStore();
  const [savedStates, setSavedStates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSavedStates();
  }, []);

  useEffect(() => {
    if (autoSaveEnabled) {
      const saveInterval = setInterval(() => {
        handleSave(true);
      }, 30000);
      return () => clearInterval(saveInterval);
    }
  }, [autoSaveEnabled, elements, newsData, theme]);

  const loadSavedStates = async () => {
    const states = await listServerStates();
    setSavedStates(states);
  };

  const prepareStateData = () => {
    const elementsByMode = {
      cover: currentMode === 'cover' ? elements : [],
      news: currentMode === 'news' ? elements : [],
      summary: currentMode === 'summary' ? elements : []
    };

    return {
      version: "1.0",
      news_data: {
        fetched_at: new Date().toISOString(),
        items: newsData
      },
      edited_elements: elementsByMode,
      theme: theme,
      config: {
        schedule_time: "00:00",
        auto_save: autoSaveEnabled,
        export_format: ["pdf", "png"]
      }
    };
  };

  const handleSave = async (isAutoSave = false) => {
    setIsLoading(true);
    try {
      const stateData = prepareStateData();
      await saveToServer(stateData);
      if (!isAutoSave) {
        setMessage('저장 완료');
        await loadSavedStates();
      }
    } catch (error) {
      setMessage('저장 실패');
    } finally {
      setIsLoading(false);
      if (!isAutoSave) {
        setTimeout(() => setMessage(null), 3000);
      }
    }
  };

  const handleLoad = async (filename?: string) => {
    setIsLoading(true);
    try {
      const state = await loadFromServer(filename);
      if (state) {
        setMessage('불러오기 완료');
        window.location.reload();
      }
    } catch (error) {
      setMessage('불러오기 실패');
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-4 text-white">저장/불러오기</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-300">자동 저장</label>
          <button
            onClick={toggleAutoSave}
            className={`px-3 py-1 rounded ${
              autoSaveEnabled 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-600 text-gray-300'
            }`}
          >
            {autoSaveEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {lastSavedAt && (
          <div className="text-xs text-gray-400">
            마지막 저장: {new Date(lastSavedAt).toLocaleString()}
          </div>
        )}

        <button
          onClick={() => handleSave(false)}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? '저장 중...' : '수동 저장'}
        </button>

        <div className="border-t border-gray-600 pt-4">
          <h4 className="text-sm font-medium mb-2 text-gray-300">저장된 상태</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {savedStates.length === 0 ? (
              <p className="text-xs text-gray-500">저장된 상태가 없습니다</p>
            ) : (
              savedStates.map((state) => (
                <button
                  key={state.filename}
                  onClick={() => handleLoad(state.filename)}
                  className="w-full text-left p-2 text-xs bg-gray-700 rounded hover:bg-gray-600"
                >
                  <div className="text-gray-300">{state.filename}</div>
                  <div className="text-gray-500">
                    {new Date(state.saved_at).toLocaleString()}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {message && (
          <div className={`text-center p-2 rounded text-sm ${
            message.includes('실패') 
              ? 'bg-red-600 text-white' 
              : 'bg-green-600 text-white'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
} 