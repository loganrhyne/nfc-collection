import { useRef, useCallback } from 'react';

/**
 * Hook to handle touch scrolling vs tap detection
 * Prevents onClick from firing when user is scrolling
 */
export const useTouchScroll = (onClick) => {
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const isTouchMoveRef = useRef(false);
  
  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    isTouchMoveRef.current = false;
  }, []);
  
  const handleTouchMove = useCallback((e) => {
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    
    // If moved more than 10 pixels, consider it a scroll
    if (deltaX > 10 || deltaY > 10) {
      isTouchMoveRef.current = true;
    }
  }, []);
  
  const handleTouchEnd = useCallback((e) => {
    const touchDuration = Date.now() - touchStartRef.current.time;
    
    // Only trigger click if:
    // - Touch didn't move much (not scrolling)
    // - Touch was quick (less than 500ms)
    if (!isTouchMoveRef.current && touchDuration < 500 && onClick) {
      // Prevent the mouse events that follow
      e.preventDefault();
      onClick(e);
    }
  }, [onClick]);
  
  const handleClick = useCallback((e) => {
    // On touch devices, clicks come after touch events
    // If this was a touch scroll, ignore the click
    if (isTouchMoveRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // For non-touch devices, handle normally
    if (onClick && e.type === 'click' && !('ontouchstart' in window)) {
      onClick(e);
    }
  }, [onClick]);
  
  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onClick: handleClick
  };
};