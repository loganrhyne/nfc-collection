import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Custom hook for touch interactions
 * Provides tap, long press, swipe, and pinch gestures
 */
export const useTouchInteractions = ({
  onTap = () => {},
  onLongPress = () => {},
  onSwipeLeft = () => {},
  onSwipeRight = () => {},
  onSwipeUp = () => {},
  onSwipeDown = () => {},
  onPinch = () => {},
  longPressDelay = 500,
  swipeThreshold = 50,
} = {}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isPinching, setIsPinching] = useState(false);
  
  const longPressTimer = useRef(null);
  const touchStartTime = useRef(null);
  const initialPinchDistance = useRef(null);
  
  // Calculate distance between two touch points
  const getDistance = (touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };
  
  const handleTouchStart = useCallback((e) => {
    setIsPressed(true);
    touchStartTime.current = Date.now();
    
    if (e.touches.length === 1) {
      // Single touch
      const touch = e.touches[0];
      setTouchStart({
        x: touch.clientX,
        y: touch.clientY,
      });
      
      // Start long press timer
      longPressTimer.current = setTimeout(() => {
        onLongPress(e);
        // Add haptic feedback if available
        if (window.navigator.vibrate) {
          window.navigator.vibrate(50);
        }
      }, longPressDelay);
    } else if (e.touches.length === 2) {
      // Pinch gesture
      setIsPinching(true);
      initialPinchDistance.current = getDistance(e.touches[0], e.touches[1]);
    }
  }, [onLongPress, longPressDelay]);
  
  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 1 && touchStart) {
      // Track movement for swipe
      const touch = e.touches[0];
      setTouchEnd({
        x: touch.clientX,
        y: touch.clientY,
      });
      
      // Cancel long press if moved too much
      const moveDistance = Math.sqrt(
        Math.pow(touch.clientX - touchStart.x, 2) +
        Math.pow(touch.clientY - touchStart.y, 2)
      );
      
      if (moveDistance > 10 && longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    } else if (e.touches.length === 2 && isPinching) {
      // Handle pinch
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scale = currentDistance / initialPinchDistance.current;
      onPinch({ scale, event: e });
    }
  }, [touchStart, isPinching, onPinch]);
  
  const handleTouchEnd = useCallback((e) => {
    setIsPressed(false);
    
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    if (isPinching) {
      setIsPinching(false);
      initialPinchDistance.current = null;
      return;
    }
    
    // Detect tap vs swipe
    const touchDuration = Date.now() - touchStartTime.current;
    
    if (!touchEnd || !touchStart) {
      // It was a tap
      if (touchDuration < 200) {
        onTap(e);
      }
      return;
    }
    
    // Calculate swipe
    const dx = touchEnd.x - touchStart.x;
    const dy = touchEnd.y - touchStart.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    
    if (absDx > swipeThreshold || absDy > swipeThreshold) {
      if (absDx > absDy) {
        // Horizontal swipe
        if (dx > 0) {
          onSwipeRight(e);
        } else {
          onSwipeLeft(e);
        }
      } else {
        // Vertical swipe
        if (dy > 0) {
          onSwipeDown(e);
        } else {
          onSwipeUp(e);
        }
      }
    } else if (touchDuration < 200) {
      // Short tap
      onTap(e);
    }
    
    // Reset
    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, touchEnd, isPinching, onTap, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, swipeThreshold]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);
  
  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchEnd,
    },
    isPressed,
    isPinching,
  };
};

/**
 * Hook for ripple effect on touch
 */
export const useRipple = () => {
  const [ripples, setRipples] = useState([]);
  
  const addRipple = useCallback((event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.touches ? event.touches[0].clientX : event.clientX;
    const y = event.touches ? event.touches[0].clientY : event.clientY;
    
    const rippleX = x - rect.left;
    const rippleY = y - rect.top;
    
    const newRipple = {
      x: rippleX,
      y: rippleY,
      id: Date.now(),
    };
    
    setRipples((prev) => [...prev, newRipple]);
    
    // Remove ripple after animation
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);
  }, []);
  
  return { ripples, addRipple };
};