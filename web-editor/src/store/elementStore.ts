import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { DraggableElement } from '../components/types';

interface HistoryEntry {
  elements: DraggableElement[];
  timestamp: number;
}

interface CategoryElements {
  cover: DraggableElement[];
  news: DraggableElement[];
  summary: DraggableElement[];
}

interface ElementState {
  elements: DraggableElement[];
  categoryElements: CategoryElements;
  currentCategory: 'cover' | 'news' | 'summary';
  selectedElement: string | null;
  history: HistoryEntry[];
  historyIndex: number;
  setElements: (elements: DraggableElement[]) => void;
  setCategoryElements: (category: 'cover' | 'news' | 'summary', elements: DraggableElement[]) => void;
  setCurrentCategory: (category: 'cover' | 'news' | 'summary') => void;
  updateElement: (updatedElement: DraggableElement) => void;
  selectElement: (id: string | null) => void;
  deleteElement: (id: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

const MAX_HISTORY_SIZE = 50;

export const useElementStore = create<ElementState>()(
  devtools(
    (set, get) => ({
      elements: [],
      categoryElements: {
        cover: [],
        news: [],
        summary: []
      },
      currentCategory: 'cover',
      selectedElement: null,
      history: [],
      historyIndex: -1,
      
      setElements: (elements) => {
        const state = get();
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push({ elements: state.elements, timestamp: Date.now() });
        if (newHistory.length > MAX_HISTORY_SIZE) {
          newHistory.shift();
        }
        set({ 
          elements, 
          history: newHistory,
          historyIndex: newHistory.length - 1
        });
        // 현재 카테고리에도 저장
        const newCategoryElements = { ...state.categoryElements };
        newCategoryElements[state.currentCategory] = elements;
        set({ categoryElements: newCategoryElements });
      },
      
      setCategoryElements: (category, elements) => {
        const state = get();
        const newCategoryElements = { ...state.categoryElements };
        newCategoryElements[category] = elements;
        set({ categoryElements: newCategoryElements });
      },
      
      setCurrentCategory: (category) => {
        const state = get();
        // 카테고리의 요소가 있으면 사용, 없으면 현재 elements 유지
        const categoryElements = state.categoryElements[category];
        if (categoryElements && categoryElements.length > 0) {
          set({ 
            currentCategory: category,
            elements: categoryElements,
            selectedElement: null
          });
        } else {
          set({ 
            currentCategory: category,
            selectedElement: null
          });
        }
      },
      
      updateElement: (updatedElement) => {
        const state = get();
        const newElements = state.elements.map((el) =>
          el.id === updatedElement.id ? updatedElement : el
        );
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push({ elements: state.elements, timestamp: Date.now() });
        if (newHistory.length > MAX_HISTORY_SIZE) {
          newHistory.shift();
        }
        // categoryElements도 업데이트
        const newCategoryElements = { ...state.categoryElements };
        newCategoryElements[state.currentCategory] = newElements;
        set({
          elements: newElements,
          categoryElements: newCategoryElements,
          history: newHistory,
          historyIndex: newHistory.length - 1
        });
      },
      
      selectElement: (id) => set({ selectedElement: id }),
      
      deleteElement: (id) => {
        const state = get();
        const newElements = state.elements.filter((el) => el.id !== id);
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push({ elements: state.elements, timestamp: Date.now() });
        if (newHistory.length > MAX_HISTORY_SIZE) {
          newHistory.shift();
        }
        // categoryElements도 업데이트
        const newCategoryElements = { ...state.categoryElements };
        newCategoryElements[state.currentCategory] = newElements;
        set({
          elements: newElements,
          categoryElements: newCategoryElements,
          selectedElement: null,
          history: newHistory,
          historyIndex: newHistory.length - 1
        });
      },
      
      undo: () => {
        const state = get();
        if (state.historyIndex > 0) {
          const previousState = state.history[state.historyIndex - 1];
          set({
            elements: previousState.elements,
            historyIndex: state.historyIndex - 1
          });
        }
      },
      
      redo: () => {
        const state = get();
        if (state.historyIndex < state.history.length - 1) {
          const nextState = state.history[state.historyIndex + 1];
          set({
            elements: nextState.elements,
            historyIndex: state.historyIndex + 1
          });
        }
      },
      
      canUndo: () => {
        const state = get();
        return state.historyIndex > 0;
      },
      
      canRedo: () => {
        const state = get();
        return state.historyIndex < state.history.length - 1;
      }
    }),
    {
      name: 'element-storage',
    }
  )
); 