import React, { useEffect } from 'react';

const TouchDebug = () => {
  useEffect(() => {
    const logTouchEvent = (eventName) => (e) => {
      console.log(`Touch Debug - ${eventName}:`, {
        target: e.target.tagName,
        className: e.target.className,
        id: e.target.id,
        touches: e.touches?.length,
        defaultPrevented: e.defaultPrevented,
        bubbles: e.bubbles,
        cancelable: e.cancelable
      });
    };

    const handlers = {
      touchstart: logTouchEvent('touchstart'),
      touchmove: logTouchEvent('touchmove'),
      touchend: logTouchEvent('touchend'),
      touchcancel: logTouchEvent('touchcancel')
    };

    // Add listeners
    Object.entries(handlers).forEach(([event, handler]) => {
      document.addEventListener(event, handler, { passive: false, capture: true });
    });

    // Also log what's preventing default scrolling
    const preventDefaultLogger = (e) => {
      const original = e.preventDefault;
      e.preventDefault = function() {
        console.log('Touch Debug - preventDefault called on:', e.type, e.target);
        console.trace();
        original.call(this);
      };
    };

    document.addEventListener('touchmove', preventDefaultLogger, true);

    return () => {
      // Cleanup
      Object.entries(handlers).forEach(([event, handler]) => {
        document.removeEventListener(event, handler, { capture: true });
      });
      document.removeEventListener('touchmove', preventDefaultLogger, true);
    };
  }, []);

  return null;
};

export default TouchDebug;