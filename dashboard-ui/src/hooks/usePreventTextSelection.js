import { useEffect } from 'react';

/**
 * Hook to prevent text selection on touch devices in a specific container
 */
export const usePreventTextSelection = (containerRef) => {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    // Only apply on touch devices
    if (!('ontouchstart' in window)) return;
    
    const preventSelection = (e) => {
      // Allow scrolling but prevent text selection
      const target = e.target;
      const tagName = target.tagName.toLowerCase();
      
      // Allow selection on input elements
      if (tagName === 'input' || tagName === 'textarea') return;
      
      // Check if this element should allow selection
      const hasSelectableClass = target.classList.contains('selectable') ||
                                target.closest('.selectable');
      
      if (!hasSelectableClass) {
        // Prevent text selection
        e.preventDefault();
        
        // But allow the scroll to continue
        const touch = e.touches[0];
        const scrollable = target.closest('[class*="RightColumn"], [class*="ScrollableTimelineContainer"], #timeline-scroll-container');
        if (scrollable && touch) {
          // Manually handle scrolling if needed
          const startY = touch.clientY;
          
          const handleMove = (moveEvent) => {
            const touchMove = moveEvent.touches[0];
            const deltaY = startY - touchMove.clientY;
            scrollable.scrollTop += deltaY;
          };
          
          const handleEnd = () => {
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleEnd);
          };
          
          document.addEventListener('touchmove', handleMove, { passive: true });
          document.addEventListener('touchend', handleEnd, { passive: true });
        }
      }
    };
    
    // Add touch event listeners
    container.addEventListener('selectstart', preventSelection, { passive: false });
    
    return () => {
      container.removeEventListener('selectstart', preventSelection);
    };
  }, [containerRef]);
};