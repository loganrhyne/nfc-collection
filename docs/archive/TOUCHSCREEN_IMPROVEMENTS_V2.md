# Touchscreen Scrolling Improvements V2

## Problem
Timeline entries were showing text selection instead of scrolling when touched on touchscreen devices.

## Root Causes
1. Timeline cards didn't have `user-select: none` CSS
2. onClick handlers were firing during scroll gestures
3. Touch events weren't properly distinguished from scroll events

## Solutions Implemented

### 1. CSS Updates to TimelineCard Component
Added to prevent text selection on the cards:
```css
/* Prevent text selection on the card itself */
-webkit-touch-callout: none; /* iOS Safari */
-webkit-user-select: none; /* Safari */
-khtml-user-select: none; /* Konqueror HTML */
-moz-user-select: none; /* Old versions of Firefox */
-ms-user-select: none; /* Internet Explorer/Edge */
user-select: none; /* Non-prefixed version */
```

### 2. Touch vs Click Detection Hook
Created `useTouchScroll` hook that:
- Tracks touch start position and time
- Detects if touch moved more than 10 pixels (scrolling)
- Only triggers onClick if touch was stationary and quick (<500ms)
- Prevents click events after scroll gestures

### 3. Timeline Implementation
Updated VerticalTimeline to use the hook:
```javascript
const touchHandlers = useTouchScroll(() => handleItemClick(entry));

<TimelineCard
  key={entry.uuid}
  id={`timeline-entry-${entry.uuid}`}
  {...touchHandlers}
  selected={isSelected}
>
```

### 4. Preserved Text Selection
Important content remains selectable:
- Dates (TimelineDate)
- Entry types (TimelineType)  
- Titles (TimelineTitle)
- Locations (TimelineLocation)

## How It Works
1. **Touch Start**: Records position and time
2. **Touch Move**: If moved >10px, marks as scrolling
3. **Touch End**: Only fires onClick if not scrolling and <500ms
4. **Click Event**: Blocked if preceded by scroll gesture

## Benefits
- Natural scrolling on touchscreens
- Taps still select entries
- No accidental selections during scrolling
- Important text remains copyable
- Works on all touch devices

## Testing
1. Touch and drag on timeline - should scroll smoothly
2. Quick tap on entry - should select it
3. Long press on date/title - should allow text selection
4. Mouse clicks - should work normally on desktop