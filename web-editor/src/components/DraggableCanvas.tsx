import React, { CSSProperties, useState, useRef, useLayoutEffect } from 'react';
import type { DraggableElement } from '../types';
import { DraggableItem } from './DraggableItem';
import { type PanInfo, motion } from 'framer-motion';
import { useElementStore } from '../store/elementStore';

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = CANVAS_WIDTH / 16 * 9;

interface DraggableCanvasProps {
  elements: DraggableElement[];
  selectedElement: string | null;
  backgroundGradient: string;
    }

const DraggableCanvas: React.FC<DraggableCanvasProps> = ({
  elements,
  selectedElement,
  backgroundGradient,
}) => {
  const updateElement = useElementStore((state) => state.updateElement);
  const selectElement = useElementStore((state) => state.selectElement);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const calculateScale = () => {
      if (containerRef.current) {
        const { width: containerWidth, height: containerHeight } = containerRef.current.getBoundingClientRect();
        const scaleX = containerWidth / CANVAS_WIDTH;
        const scaleY = containerHeight / CANVAS_HEIGHT;
        setScale(Math.min(scaleX, scaleY, 1));
      }
    };
    
    calculateScale();
    const debouncedCalculateScale = () => setTimeout(calculateScale, 100);
    window.addEventListener('resize', debouncedCalculateScale);
    return () => window.removeEventListener('resize', debouncedCalculateScale);
  }, []);
  
  const handleUpdate = (updatedElement: DraggableElement) => {
    updateElement(updatedElement);
  };

  const handleDragUpdate = (element: DraggableElement, info: PanInfo) => {
    updateElement({
          ...element,
          position: {
        x: element.position.x + info.offset.x / scale,
        y: element.position.y + info.offset.y / scale,
      },
    });
  };

  const ResizeHandle: React.FC<{
    elementId: string;
    corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  }> = ({ elementId, corner }) => {
    const initialElementRef = useRef<DraggableElement | null>(null);

    const handleResizeEnd = (
      e: MouseEvent | TouchEvent | PointerEvent,
      info: PanInfo
    ) => {
      e.stopPropagation();
      const element = initialElementRef.current;
      if (!element) return;

      const newSize = { ...element.size };
      const newPosition = { ...element.position };
      
      const { x, y } = info.offset;

      if (corner.includes('Right')) newSize.width = Math.max(20, element.size.width + x);
      if (corner.includes('Left')) {
        newSize.width = Math.max(20, element.size.width - x);
        newPosition.x = element.position.x + x;
      }
      if (corner.includes('Bottom')) newSize.height = Math.max(20, element.size.height + y);
      if (corner.includes('Top')) {
        newSize.height = Math.max(20, element.size.height - y);
        newPosition.y = element.position.y + y;
      }

      updateElement({ ...element, size: newSize, position: newPosition });
      initialElementRef.current = null;
    };
    
    const cursorClass =
      corner === 'topLeft' || corner === 'bottomRight' ? 'resize-handle-cursor-nwse'
      : corner === 'topRight' || corner === 'bottomLeft' ? 'resize-handle-cursor-nesw'
      : corner.includes('Left') || corner.includes('Right') ? 'resize-handle-cursor-ew'
      : 'resize-handle-cursor-ns';

    const positionClass = [
      corner.includes('top') ? 'resize-handle-top' : 'resize-handle-bottom',
      corner.includes('left') ? 'resize-handle-left' : 'resize-handle-right'
    ].join(' ');

    return (
      <motion.div
        drag
        onDragStart={(e) => {
          e.stopPropagation();
          initialElementRef.current = elements.find(el => el.id === elementId) || null;
        }}
        onDragEnd={handleResizeEnd}
        dragMomentum={false}
        className={`resize-handle ${cursorClass} ${positionClass}`}
      />
    );
  };

  const canvasWrapperStyle: CSSProperties = {
    width: `${CANVAS_WIDTH}px`,
    height: `${CANVAS_HEIGHT}px`,
    background: backgroundGradient,
    transform: `scale(${scale})`,
    transformOrigin: 'center center',
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) selectElement(null);
      }}
        >
          <div 
        className="draggable-canvas relative shadow-lg overflow-hidden"
        style={canvasWrapperStyle}
      >
        {elements.map((element) => (
          <DraggableItem
              key={element.id}
              element={element}
            isSelected={element.id === selectedElement}
            onSelect={selectElement}
            onUpdate={(info) => handleDragUpdate(element, info)}
          >
            {element.type === 'text' && (
              <div
                className="element-text whitespace-pre-wrap break-words"
                style={{
                  '--font-size': `${element.fontSize}px`,
                  '--color': element.color,
                  '--font-family': element.fontFamily,
                  '--text-align': element.textAlign,
                  '--background-color': element.backgroundColor,
                } as CSSProperties}
              >
                {element.content}
              </div>
            )}
            {element.type === 'image' && (
              <img
                src={element.imageUrl}
                alt="element"
                className="w-full h-full object-cover pointer-events-none"
              />
            )}
            {element.type === 'container' && (
              <div
                className="element-container"
                style={{
                  '--background-color': element.backgroundColor,
                  '--border-radius': `${element.borderRadius}px`,
                  '--border-width': element.borderWidth ? `${element.borderWidth}px` : '0',
                  '--border-color': element.borderColor,
                  '--box-shadow': element.boxShadow,
                  '--backdrop-filter': element.backdropFilter,
                } as CSSProperties}
              />
            )}

            {selectedElement === element.id && (
              <>
                <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none" />
                <ResizeHandle elementId={element.id} corner="topLeft" />
                <ResizeHandle elementId={element.id} corner="topRight" />
                <ResizeHandle elementId={element.id} corner="bottomLeft" />
                <ResizeHandle elementId={element.id} corner="bottomRight" />
              </>
            )}
          </DraggableItem>
          ))}
        </div>
    </div>
  );
};

export default DraggableCanvas; 