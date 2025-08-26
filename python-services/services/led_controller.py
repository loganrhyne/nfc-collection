#!/usr/bin/env python3
"""
LED Controller for NFC Collection
Supports both interactive and visualization modes
"""

import logging
import asyncio
from typing import Dict, Tuple, Optional, List, Set
from dataclasses import dataclass
from enum import Enum

# Try to import hardware library
HARDWARE_AVAILABLE = False
try:
    import board
    import neopixel
    HARDWARE_AVAILABLE = True
except ImportError:
    pass

logger = logging.getLogger(__name__)


@dataclass
class LEDConfig:
    """LED configuration"""
    num_pixels: int = 100  # 20x5 grid = 100 LEDs
    grid_rows: int = 5     # 5 rows
    grid_cols: int = 20    # 20 columns
    gpio_pin: str = "D18"
    pixel_order: str = "GRB"
    brightness_filtered: float = 0.05  # 5% for background
    brightness_selected: float = 0.8   # 80% for selected
    mock_mode: bool = False




class LEDMode(Enum):
    """LED operation modes"""
    INTERACTIVE = "interactive"
    VISUALIZATION = "visualization"


class LEDController:
    """LED controller with interactive and visualization modes"""
    
    def __init__(self, config: Optional[LEDConfig] = None):
        self.config = config or LEDConfig()
        self._pixels = None
        self._current_indices: Set[int] = set()  # Track which LEDs are currently on
        self._selected_index: Optional[int] = None
        self._mode = LEDMode.INTERACTIVE
        self._visualization_engine = None
        
        # Initialize hardware if available
        if HARDWARE_AVAILABLE and not self.config.mock_mode:
            try:
                pin = getattr(board, self.config.gpio_pin)
                self._pixels = neopixel.NeoPixel(
                    pin,
                    self.config.num_pixels,
                    auto_write=False,
                    pixel_order=self.config.pixel_order,
                    brightness=1.0  # Control brightness per-pixel
                )
                # Clear on startup
                self._pixels.fill((0, 0, 0))
                self._pixels.show()
                logger.info("LED hardware initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize LED hardware: {e}")
                self._pixels = None
    
    def hex_to_rgb(self, hex_color: str) -> Tuple[int, int, int]:
        """Convert hex color to RGB tuple"""
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    
    def _get_pixel_index(self, logical_index: int) -> int:
        """Convert logical grid position to physical pixel index (serpentine)"""
        if not 0 <= logical_index < self.config.num_pixels:
            return logical_index
            
        row = logical_index // self.config.grid_cols
        col = logical_index % self.config.grid_cols
        
        # Even rows go left-to-right, odd rows go right-to-left
        if row % 2 == 0:
            return row * self.config.grid_cols + col
        else:
            return row * self.config.grid_cols + (self.config.grid_cols - 1 - col)
    
    async def update_interactive_mode(self, entries: List[Dict]):
        """
        Update LEDs for interactive mode
        Only shows filtered entries, with selected entry brighter
        
        Args:
            entries: List of dicts with keys:
                - index: Grid position (0-149)
                - color: Hex color string
                - isSelected: Boolean
        """
        # Extract indices and find selected
        new_indices = set()
        new_selected = None
        entry_map = {}  # index -> (color, isSelected)
        
        for entry in entries:
            index = entry.get('index')
            if index is not None and 0 <= index < self.config.num_pixels:
                new_indices.add(index)
                entry_map[index] = (
                    entry.get('color', '#FFFFFF'),
                    entry.get('isSelected', False)
                )
                if entry.get('isSelected', False):
                    new_selected = index
        
        # Find LEDs to turn off (were on but not in new set)
        to_turn_off = self._current_indices - new_indices
        
        # Turn off LEDs that are no longer in the filtered set
        for index in to_turn_off:
            await self._set_pixel(index, (0, 0, 0))
        
        # Update LEDs that should be on
        for index in new_indices:
            color_hex, is_selected = entry_map[index]
            rgb = self.hex_to_rgb(color_hex)
            
            # Apply brightness
            brightness = self.config.brightness_selected if is_selected else self.config.brightness_filtered
            rgb_with_brightness = tuple(int(c * brightness) for c in rgb)
            
            await self._set_pixel(index, rgb_with_brightness)
        
        # Update tracking
        self._current_indices = new_indices
        self._selected_index = new_selected
        
        # Show changes
        if self._pixels:
            self._pixels.show()
        
        logger.info(f"LED Update: {len(new_indices)} on, {len(to_turn_off)} turned off, selected: {new_selected}")
    
    async def _set_pixel(self, index: int, rgb: Tuple[int, int, int]):
        """Set a single pixel"""
        if self._pixels and 0 <= index < self.config.num_pixels:
            physical_index = self._get_pixel_index(index)
            self._pixels[physical_index] = rgb
    
    async def clear_all(self):
        """Turn off all LEDs"""
        if self._pixels:
            self._pixels.fill((0, 0, 0))
            self._pixels.show()
        self._current_indices.clear()
        self._selected_index = None
        logger.info("All LEDs cleared")
    
    async def set_mode(self, mode: LEDMode):
        """Switch between interactive and visualization modes"""
        if self._mode == mode:
            return
            
        # Stop visualization if switching away from it
        if self._mode == LEDMode.VISUALIZATION and self._visualization_engine:
            await self._visualization_engine.stop_visualization()
        
        self._mode = mode
        
        # Clear LEDs when switching modes
        await self.clear_all()
        
        logger.info(f"LED mode changed to: {mode.value}")
    
    def get_visualization_engine(self):
        """Get or create visualization engine"""
        if self._visualization_engine is None:
            from services.led_visualizations import VisualizationEngine
            self._visualization_engine = VisualizationEngine(self)
        return self._visualization_engine
    
    def get_status(self) -> Dict:
        """Get current status"""
        return {
            'hardware_available': bool(self._pixels),
            'num_pixels': self.config.num_pixels,
            'leds_on': len(self._current_indices),
            'selected_index': self._selected_index,
            'mode': self._mode.value,
            'visualization_active': self._visualization_engine is not None and self._visualization_engine.running
        }


# Singleton instance
_controller = None

def get_led_controller() -> LEDController:
    """Get the singleton LED controller instance"""
    global _controller
    if _controller is None:
        # Check for mock mode from environment
        import os
        mock = os.getenv('LED_MOCK_MODE', 'false').lower() == 'true'
        config = LEDConfig(mock_mode=mock)
        _controller = LEDController(config)
    return _controller