import React, { useState, useEffect, useRef } from 'react';

/**
 * Premium Pattern Lock Component
 * 3x3 Grid based on canvas or SVG coordinates
 * Returns a string of indices (0-8)
 */
const PatternLock = ({ onComplete, onStart, width = 300, height = 300, error = false }) => {
  const [points, setPoints] = useState([]);
  const [activePoint, setActivePoint] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  // Generate 3x3 grid coordinates
  const dotRadius = 12;
  const padding = 50;
  const spacingX = (width - padding * 2) / 2;
  const spacingY = (height - padding * 2) / 2;
  
  const dots = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      dots.push({
        id: r * 3 + c,
        x: padding + c * spacingX,
        y: padding + r * spacingY
      });
    }
  }

  const getPointerPos = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const handleStart = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setPoints([]);
    onStart?.();
    handleMove(e);
  };

  const handleMove = (e) => {
    if (!isDragging) return;
    const pos = getPointerPos(e);
    setActivePoint(pos);

    // Check if pointer is over a dot
    const threshold = 30;
    const hoverDot = dots.find(dot => {
      const dist = Math.sqrt(Math.pow(pos.x - dot.x, 2) + Math.pow(pos.y - dot.y, 2));
      return dist < threshold;
    });

    if (hoverDot && !points.find(p => p.id === hoverDot.id)) {
      setPoints([...points, hoverDot]);
    }
  };

  const handleEnd = () => {
    if (points.length > 0) {
      onComplete?.(points.map(p => p.id).join(''));
    }
    setIsDragging(false);
    setActivePoint(null);
  };

  useEffect(() => {
    const handleGlobalUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalUp);
    return () => window.removeEventListener('mouseup', handleGlobalUp);
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`relative select-none touch-none bg-white rounded-xl shadow-inner border-4 transition-all duration-300 ${error ? 'border-red-200 bg-red-50' : 'border-gray-50'}`}
      style={{ width, height }}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
    >
      <svg width={width} height={height} className="absolute inset-0 pointer-events-none">
        {/* Connection Lines */}
        {points.length > 0 && points.map((p, i) => (
          i < points.length - 1 ? (
            <line
              key={`line-${i}`}
              x1={p.x} y1={p.y}
              x2={points[i+1].x} y2={points[i+1].y}
              stroke={error ? '#ef4444' : '#4285f4'}
              strokeWidth="4"
              strokeLinecap="round"
              className="animate-in fade-in duration-300"
            />
          ) : null
        ))}
        
        {/* Active Line (currently dragging) */}
        {isDragging && points.length > 0 && activePoint && (
          <line
            x1={points[points.length-1].x} y1={points[points.length-1].y}
            x2={activePoint.x} y2={activePoint.y}
            stroke={error ? '#f87171' : '#bbdefb'}
            strokeWidth="3"
            strokeDasharray="5,5"
          />
        )}

        {/* Dots Grid */}
        {dots.map(dot => {
          const isSelected = points.find(p => p.id === dot.id);
          return (
            <g key={dot.id}>
              {/* Outer Glow */}
              {isSelected && (
                <circle
                  cx={dot.x} cy={dot.y} r={dotRadius * 2}
                  fill={error ? '#fee2e2' : '#e3f2fd'}
                  className="animate-ping duration-700 opacity-50"
                />
              )}
              {/* Dot Background */}
              <circle
                cx={dot.x} cy={dot.y} r={dotRadius}
                fill={isSelected ? (error ? '#ef4444' : '#4285f4') : '#f1f3f4'}
                className="transition-all duration-200"
              />
              {/* Center Dot */}
              <circle
                cx={dot.x} cy={dot.y} r={dotRadius / 3}
                fill="white"
                className={`${isSelected ? 'opacity-100' : 'opacity-0'} transition-opacity`}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default PatternLock;
