import { forwardRef } from 'react';
import { motion, type PanInfo } from 'framer-motion';

interface DraggableItemProps {
  element: {
    id: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    zIndex?: number;
  };
  children: React.ReactNode;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (info: PanInfo) => void;
}

export const DraggableItem = forwardRef<HTMLDivElement, DraggableItemProps>(
  ({ element, children, isSelected, onSelect, onUpdate }, ref) => {
    return (
      <motion.div
        ref={ref}
        drag
        onDragEnd={(event, info) => onUpdate(info)}
        onTap={(e) => {
          e.stopPropagation();
          onSelect(element.id);
        }}
        dragMomentum={false}
        className="draggable-item"
        style={{
          position: 'absolute',
          left: element.position.x,
          top: element.position.y,
          width: element.size.width,
          height: element.size.height,
          zIndex: element.zIndex,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full h-full">
          {children}
        </div>
        {isSelected && (
           <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none" />
         )}
      </motion.div>
    );
  }
);

DraggableItem.displayName = 'DraggableItem'; 