// Universal touch scroll fix for the timeline
export const applyTouchScrollFix = () => {
  // Create and inject global styles
  const styleId = 'timeline-touch-scroll-fix';
  
  // Remove existing style if present
  const existingStyle = document.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }
  
  const style = document.createElement('style');
  style.id = styleId;
  style.innerHTML = `
    /* Universal timeline touch fix */
    
    /* Fix for all scrollable containers */
    [class*="RightColumn"],
    [class*="ScrollableTimelineContainer"],
    #timeline-scroll-container,
    .timeline-container {
      -webkit-overflow-scrolling: touch !important;
      overflow-y: auto !important;
    }
    
    /* Prevent selection on ALL divs inside timeline entries */
    [class*="TimelineEntries"] > div,
    [class*="TimelineCard"],
    [class*="RightColumn"] > div > div > div {
      -webkit-touch-callout: none !important;
      -webkit-user-select: none !important;
      -khtml-user-select: none !important;
      -moz-user-select: none !important;  
      -ms-user-select: none !important;
      user-select: none !important;
      -webkit-tap-highlight-color: transparent !important;
    }
    
    /* Re-enable selection on specific text */
    [class*="TimelineDate"],
    [class*="TimelineType"],
    [class*="TimelineTitle"],
    [class*="TimelineLocation"] {
      -webkit-user-select: text !important;
      -moz-user-select: text !important;
      -ms-user-select: text !important;
      user-select: text !important;
    }
    
    /* Extra aggressive fix for mobile Safari */
    @supports (-webkit-touch-callout: none) {
      [class*="TimelineEntries"] > div {
        -webkit-touch-callout: none !important;
        -webkit-user-select: none !important;
        cursor: pointer !important;
      }
    }
    
    /* Debug styles - add red border to non-selectable elements */
    .debug-touch-fix [class*="TimelineCard"] {
      border: 2px solid red !important;
    }
  `;
  
  document.head.appendChild(style);
  
  // Log what we find
  console.log('Touch Scroll Fix Applied');
  console.log('Found timeline containers:', {
    rightColumn: document.querySelectorAll('[class*="RightColumn"]').length,
    scrollableTimeline: document.querySelectorAll('[class*="ScrollableTimelineContainer"]').length,
    timelineEntries: document.querySelectorAll('[class*="TimelineEntries"]').length,
    timelineCards: document.querySelectorAll('[class*="TimelineCard"]').length
  });
  
  // Add debug class to body
  if (window.location.search.includes('debug')) {
    document.body.classList.add('debug-touch-fix');
  }
  
  // Force Safari to recalculate styles
  const containers = document.querySelectorAll('[class*="RightColumn"], [class*="ScrollableTimelineContainer"]');
  containers.forEach(container => {
    container.style.display = 'none';
    container.offsetHeight; // Force reflow
    container.style.display = '';
  });
};

// Apply fix on load and whenever the route changes
export const initTouchScrollFix = () => {
  // Apply immediately
  applyTouchScrollFix();
  
  // Re-apply after route changes
  let lastPath = window.location.pathname;
  setInterval(() => {
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname;
      setTimeout(applyTouchScrollFix, 100);
    }
  }, 500);
  
  // Also apply after any dynamic content loads
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        const hasTimeline = Array.from(mutation.addedNodes).some(node => 
          node.nodeType === 1 && (
            node.className?.includes('Timeline') ||
            node.querySelector?.('[class*="Timeline"]')
          )
        );
        if (hasTimeline) {
          setTimeout(applyTouchScrollFix, 50);
        }
      }
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
};