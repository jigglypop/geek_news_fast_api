import { create } from 'zustand';
import type { DraggableElement } from '../components/types';

interface ElementState {
  elements: DraggableElement[];
  selectedElement: string | null;
  setElements: (elements: DraggableElement[]) => void;
  updateElement: (updatedElement: DraggableElement) => void;
  selectElement: (id: string | null) => void;
}

export const useElementStore = create<ElementState>((set) => ({
  elements: [],
  selectedElement: null,
  setElements: (elements) => set({ elements }),
  updateElement: (updatedElement) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === updatedElement.id ? updatedElement : el
      ),
    })),
  selectElement: (id) => set({ selectedElement: id }),
})); 