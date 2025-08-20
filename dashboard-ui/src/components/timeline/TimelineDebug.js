import React, { useEffect } from 'react';

// Component to inject debugging and a more aggressive CSS fix
const TimelineDebug = () => {
  useEffect(() => {
    // Inject global CSS fix
    const style = document.createElement('style');
    style.innerHTML = `
      /* Aggressive touch scrolling fix for timeline */
      #timeline-scroll-container,
      .timeline-container,
      div[class*="RightColumn"],
      div[class*="ScrollableTimelineContainer"] {
        /* Force smooth scrolling */
        -webkit-overflow-scrolling: touch !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
      }
      
      /* Prevent ALL text selection in timeline cards */
      div[class*="TimelineCard"],
      div[class*="TimelineEntries"] > div {
        -webkit-touch-callout: none !important;
        -webkit-user-select: none !important;
        -khtml-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        
        /* Ensure we don't block scrolling */
        touch-action: pan-y !important;
        pointer-events: auto !important;
      }
      
      /* But allow selection on specific text elements */
      div[class*="TimelineDate"],
      div[class*="TimelineType"],
      div[class*="TimelineTitle"],
      div[class*="TimelineLocation"] {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
      }
      
      /* Mobile-specific fixes */
      @media (hover: none) and (pointer: coarse) {
        div[class*="TimelineCard"] {
          /* Delay touch feedback to allow scrolling */
          touch-action: pan-y !important;
          -webkit-tap-highlight-color: transparent !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    // Debug: Log all touch events on timeline
    const logTouch = (phase) => (e) => {
      const target = e.target;
      const classList = target.className || 'no-class';
      console.log(`Timeline Touch ${phase}:`, {
        className: classList,
        tagName: target.tagName,
        userSelect: window.getComputedStyle(target).userSelect,
        touchAction: window.getComputedStyle(target).touchAction,
        overflow: window.getComputedStyle(target).overflow
      });
    };
    
    const container = document.getElementById('timeline-scroll-container');
    if (container) {
      container.addEventListener('touchstart', logTouch('start'), { passive: true });
      container.addEventListener('touchmove', logTouch('move'), { passive: true });
      container.addEventListener('touchend', logTouch('end'), { passive: true });
      
      console.log('Timeline Debug: Added touch listeners to', container);
      console.log('Container computed style:', {
        overflow: window.getComputedStyle(container).overflow,
        overflowY: window.getComputedStyle(container).overflowY,
        webkitOverflowScrolling: window.getComputedStyle(container).webkitOverflowScrolling,
        touchAction: window.getComputedStyle(container).touchAction,
        userSelect: window.getComputedStyle(container).userSelect
      });
    }
    
    return () => {
      document.head.removeChild(style);
      if (container) {
        container.removeEventListener('touchstart', logTouch('start'));
        container.removeEventListener('touchmove', logTouch('move'));
        container.removeEventListener('touchend', logTouch('end'));
      }
    };
  }, []);
  
  return null;
};

export default TimelineDebug;