import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

interface SavedState {
  version: string;
  newsData: {
    fetchedAt: string;
    items: any[];
  };
  editedElements: {
    cover: any[];
    news: any[];
    summary: any[];
  };
  theme: any;
  config: {
    scheduleTime: string;
    autoSave: boolean;
    exportFormat: string[];
  };
}

interface PersistState {
  savedState: SavedState | null;
  lastSavedAt: string | null;
  autoSaveEnabled: boolean;
  saveToLocal: (state: SavedState) => void;
  loadFromLocal: () => SavedState | null;
  saveToServer: (state: SavedState) => Promise<void>;
  loadFromServer: (filename?: string) => Promise<SavedState | null>;
  listServerStates: () => Promise<any[]>;
  toggleAutoSave: () => void;
  clearLocal: () => void;
}

const API_BASE_URL = 'http://localhost:8000';

export const usePersistStore = create<PersistState>()(
  devtools(
    persist(
      (set, get) => ({
      savedState: null,
      lastSavedAt: null,
      autoSaveEnabled: false,
      
      saveToLocal: (state) => {
        const savedAt = new Date().toISOString();
        set({ 
          savedState: state, 
          lastSavedAt: savedAt 
        });
      },
      
      loadFromLocal: () => {
        return get().savedState;
      },
      
      saveToServer: async (state) => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/state`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(state),
          });
          
          if (!response.ok) {
            throw new Error('서버 저장 실패');
          }
          
          const result = await response.json();
          set({ lastSavedAt: result.saved_at });
          console.log('[PERSIST] 서버 저장 완료:', result.filename);
        } catch (error) {
          console.error('[ERROR] 서버 저장 실패:', error);
          throw error;
        }
      },
      
      loadFromServer: async (filename) => {
        try {
          const url = filename 
            ? `${API_BASE_URL}/api/state?filename=${filename}`
            : `${API_BASE_URL}/api/state`;
            
          const response = await fetch(url);
          
          if (!response.ok) {
            throw new Error('서버 불러오기 실패');
          }
          
          const result = await response.json();
          
          if (result.status === 'no_data') {
            return null;
          }
          
          const state = result.data;
          set({ 
            savedState: state,
            lastSavedAt: state.saved_at 
          });
          
          console.log('[PERSIST] 서버 불러오기 완료:', result.filename);
          return state;
        } catch (error) {
          console.error('[ERROR] 서버 불러오기 실패:', error);
          throw error;
        }
      },
      
      listServerStates: async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/state/list`);
          
          if (!response.ok) {
            throw new Error('목록 조회 실패');
          }
          
          const result = await response.json();
          return result.states || [];
        } catch (error) {
          console.error('[ERROR] 목록 조회 실패:', error);
          return [];
        }
      },
      
      toggleAutoSave: () => {
        set((state) => ({ autoSaveEnabled: !state.autoSaveEnabled }));
      },
      
      clearLocal: () => {
        set({ savedState: null, lastSavedAt: null });
      },
      }),
      {
        name: 'geek-news-persist',
        partialize: (state) => ({
          savedState: state.savedState,
          lastSavedAt: state.lastSavedAt,
          autoSaveEnabled: state.autoSaveEnabled,
        }),
      }
    ),
    {
      name: 'persist-storage',
    }
  )
); 