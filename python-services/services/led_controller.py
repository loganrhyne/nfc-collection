#!/usr/bin/env python3
"""
LED Controller for NFC Collection
Manages LED grid state based on WebSocket commands
"""

import logging
import asyncio
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass

# LED hardware imports
# Force mock mode for development environment
# Note: The deployment script automatically sets this to False on the Pi
FORCE_MOCK = True  # Set to False on actual Raspberry Pi hardware

try:
    if not FORCE_MOCK:
        import board
        import adafruit_pixelbuf
        try:
            # Try Pi5 specific module first
            from adafruit_raspberry_pi5_neopixel_write import neopixel_write
        except ImportError:
            # Fall back to standard neopixel_write for other platforms
            from neopixel_write import neopixel_write
        HARDWARE_AVAILABLE = True
    else:
        # Mock implementations
        class board:
            D18 = 18
        
        import adafruit_pixelbuf
        
        def neopixel_write(pin, buffer):
            pass
        
        HARDWARE_AVAILABLE = False
        logging.warning("LED controller running in forced mock mode")
except ImportError:
    HARDWARE_AVAILABLE = False
    logging.warning("LED hardware libraries not available - running in mock mode")

logger = logging.getLogger(__name__)


@dataclass
class LEDConfig:
    """LED strip configuration"""
    data_pin: int = 18  # GPIO pin
    num_pixels: int = 150  # 10x15 grid
    grid_rows: int = 10
    grid_cols: int = 15
    brightness: float = 0.5
    serpentine: bool = True  # Zig-zag wiring pattern
    mock_mode: bool = not HARDWARE_AVAILABLE


if HARDWARE_AVAILABLE:
    class Pi5Pixelbuf(adafruit_pixelbuf.PixelBuf):
        """Pixel buffer for Raspberry Pi 5"""
        def __init__(self, pin, size, **kwargs):
            self._pin = pin
            super().__init__(size=size, **kwargs)
        
        def _transmit(self, buf):
            neopixel_write(self._pin, buf)
else:
    class Pi5Pixelbuf:
        """Mock pixel buffer when hardware not available"""
        def __init__(self, pin, size, **kwargs):
            self._pin = pin
            self._size = size
            self._pixels = [0] * (size * 3)  # RGB values
            self.auto_write = kwargs.get('auto_write', True)
        
        def __setitem__(self, index, value):
            if isinstance(value, (tuple, list)) and len(value) == 3:
                start = index * 3
                self._pixels[start:start+3] = value
                if self.auto_write:
                    self.show()
        
        def fill(self, value):
            if isinstance(value, int) and value == 0:
                self._pixels = [0] * len(self._pixels)
            elif isinstance(value, (tuple, list)) and len(value) == 3:
                for i in range(0, len(self._pixels), 3):
                    self._pixels[i:i+3] = value
            if self.auto_write:
                self.show()
        
        def show(self):
            # Mock implementation - just log
            logger.debug("Mock LED show() called")


class LEDController:
    """Controls the LED grid for the sand collection"""
    
    def __init__(self, config: LEDConfig = None):
        self.config = config or LEDConfig()
        self._pixels = None
        self._current_state = {}
        self._selected_index = None
        
        # Initialize hardware
        if not self.config.mock_mode:
            self._initialize_hardware()
    
    def _initialize_hardware(self):
        """Initialize the LED hardware"""
        try:
            pin = getattr(board, f"D{self.config.data_pin}")
            self._pixels = Pi5Pixelbuf(
                pin, 
                self.config.num_pixels,
                auto_write=False,
                byteorder="GRB"  # Correct byte order for this LED strip
            )
            # Start with all LEDs off
            self._pixels.fill(0)
            self._pixels.show()
            logger.info(f"LED hardware initialized: {self.config.num_pixels} pixels")
        except Exception as e:
            logger.error(f"Failed to initialize LED hardware: {e}")
            self.config.mock_mode = True
    
    def _index_to_grid(self, index: int) -> Tuple[int, int]:
        """Convert linear index to grid coordinates"""
        row = index // self.config.grid_cols
        col = index % self.config.grid_cols
        
        # Handle serpentine wiring (zig-zag pattern)
        if self.config.serpentine and row % 2 == 1:
            col = self.config.grid_cols - 1 - col
        
        return row, col
    
    def _grid_to_pixel_index(self, row: int, col: int) -> int:
        """Convert grid coordinates to pixel index"""
        if self.config.serpentine and row % 2 == 1:
            col = self.config.grid_cols - 1 - col
        return row * self.config.grid_cols + col
    
    def _color_to_rgb(self, color: str) -> Tuple[int, int, int]:
        """Convert hex color to RGB tuple"""
        # Remove # if present
        color = color.lstrip('#')
        return tuple(int(color[i:i+2], 16) for i in (0, 2, 4))
    
    def _apply_brightness(self, rgb: Tuple[int, int, int], brightness: float = None) -> Tuple[int, int, int]:
        """Apply brightness multiplier to RGB values"""
        if brightness is None:
            brightness = self.config.brightness
        return tuple(int(c * brightness) for c in rgb)
    
    async def clear_all(self):
        """Turn off all LEDs"""
        if self.config.mock_mode:
            logger.info("Mock: Clearing all LEDs")
            self._current_state.clear()
            return
        
        self._pixels.fill(0)
        self._pixels.show()
        self._current_state.clear()
        logger.debug("Cleared all LEDs")
    
    async def set_pixel(self, index: int, color: str, brightness: float = None):
        """Set a single pixel by collection index"""
        if index < 0 or index >= self.config.num_pixels:
            logger.warning(f"Index {index} out of range (0-{self.config.num_pixels-1})")
            return
        
        rgb = self._color_to_rgb(color)
        rgb = self._apply_brightness(rgb, brightness)
        
        if self.config.mock_mode:
            logger.info(f"Mock: Setting pixel {index} to {color} (RGB: {rgb})")
            self._current_state[index] = rgb
            return
        
        # Convert collection index to actual pixel index
        row, col = self._index_to_grid(index)
        pixel_index = self._grid_to_pixel_index(row, col)
        
        self._pixels[pixel_index] = rgb
        self._pixels.show()
        self._current_state[index] = rgb
        logger.debug(f"Set pixel {index} (grid {row},{col}) to {rgb}")
    
    async def set_selected(self, index: Optional[int], color: str = "#FFFFFF"):
        """Highlight a selected entry"""
        # Clear previous selection
        if self._selected_index is not None:
            await self.set_pixel(self._selected_index, "#000000")
        
        # Set new selection
        if index is not None:
            await self.set_pixel(index, color, brightness=1.0)  # Full brightness
            self._selected_index = index
        else:
            self._selected_index = None
    
    async def update_entries(self, entries: List[Dict]):
        """Update multiple entries at once with smooth transitions"""
        # Default brightness levels
        FILTERED_BRIGHTNESS = 0.05  # Much dimmer for filtered entries (5%)
        SELECTED_BRIGHTNESS = 0.8   # Bright for selected (80%)
        
        # Find new selected index
        new_selected_index = None
        for entry in entries:
            if entry.get('isSelected', False):
                new_selected_index = entry.get('index')
                break
        
        logger.info(f"LED Update: {len(entries)} entries, selected index: {new_selected_index}, " +
                    f"previous selected: {self._selected_index}")
        
        # If selection changed, fade out old selection first
        if (self._selected_index is not None and 
            self._selected_index != new_selected_index):
            # Fade out old selection to background level
            old_color = self._current_state.get(self._selected_index, (255, 255, 255))
            await self._fade_pixel(self._selected_index, old_color, 
                                   SELECTED_BRIGHTNESS, FILTERED_BRIGHTNESS, steps=10)
        
        # Update all pixels
        for entry in entries:
            index = entry.get('index')
            color = entry.get('color', '#FFFFFF')
            is_selected = entry.get('isSelected', False)
            
            # Target brightness
            target_brightness = SELECTED_BRIGHTNESS if is_selected else FILTERED_BRIGHTNESS
            
            if index is not None:
                if is_selected:
                    # Always ensure selected entry is at full brightness
                    if index != self._selected_index:
                        # Fade in new selection
                        await self._fade_pixel(index, self.hex_to_rgb(color),
                                               FILTERED_BRIGHTNESS, target_brightness, steps=10)
                    else:
                        # Already selected, ensure it's at correct brightness
                        await self.set_pixel(index, color, target_brightness)
                else:
                    # Set immediately for non-selected entries
                    await self.set_pixel(index, color, target_brightness)
        
        # Update tracked selected index
        self._selected_index = new_selected_index
    
    async def _fade_pixel(self, index: int, rgb: Tuple[int, int, int], 
                          start_brightness: float, end_brightness: float, steps: int = 10):
        """Fade a pixel between two brightness levels"""
        if not 0 <= index < self.config.num_pixels:
            return
            
        # Calculate brightness steps
        brightness_step = (end_brightness - start_brightness) / steps
        
        for i in range(steps + 1):
            current_brightness = start_brightness + (brightness_step * i)
            
            # Apply brightness to RGB values
            r = int(rgb[0] * current_brightness)
            g = int(rgb[1] * current_brightness)
            b = int(rgb[2] * current_brightness)
            
            # Update pixel
            if HARDWARE_AVAILABLE and not self.config.mock_mode:
                pixel_index = self._get_pixel_index(index)
                self._pixels[pixel_index] = (r, g, b)
                self._pixels.show()
            
            # Update current state for the last step
            if i == steps:
                self._current_state[index] = (r, g, b)
            
            # Small delay for smooth transition
            await asyncio.sleep(0.02)  # 20ms per step = 200ms total fade
    
    def get_status(self) -> Dict:
        """Get current LED controller status"""
        return {
            'hardware_available': HARDWARE_AVAILABLE and not self.config.mock_mode,
            'num_pixels': self.config.num_pixels,
            'grid_size': f"{self.config.grid_rows}x{self.config.grid_cols}",
            'active_pixels': len(self._current_state),
            'selected_index': self._selected_index
        }


# Singleton instance
_controller = None

def get_led_controller() -> LEDController:
    """Get the singleton LED controller instance"""
    global _controller
    if _controller is None:
        _controller = LEDController()
    return _controller