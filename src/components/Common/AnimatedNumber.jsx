import React, { useEffect, useState, useRef } from 'react';

const AnimatedNumber = ({ value, duration = 400, format = (v) => v.toFixed(2), prefix = '', suffix = '' }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const startValueRef = useRef(value);
  const startTimeRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (value === displayValue) return;

    startValueRef.current = displayValue;
    startTimeRef.current = performance.now();

    const animate = (time) => {
      const elapsed = time - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (easeOutCubic)
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      const currentVal = startValueRef.current + (value - startValueRef.current) * easeProgress;
      setDisplayValue(currentVal);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  // Initial render should just be the value
  useEffect(() => {
    setDisplayValue(value);
  }, []); // Only on mount

  return (
    <span>{prefix}{format(displayValue)}{suffix}</span>
  );
};

export default AnimatedNumber;
