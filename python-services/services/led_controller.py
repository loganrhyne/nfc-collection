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

# Hardware libraries will be imported when needed
HARDWARE_AVAILABLE = False

logger = logging.getLogger(__name__)


@dataclass
class LEDConfig:
    """LED configuration"""
    num_pixels: int = 300  # 20x15 grid = 300 LEDs
    grid_rows: int = 15
    grid_cols: int = 20
    gpio_pin: str = "D18"
    pixel_order: str = "GRB"
    brightness_filtered: float = 0.05  # 5% for background
    brightness_selected: float = 0.8   # 80% for selected
    mock_mode: bool = False
    # If True, physical pixel 0 is at the logical (rows-1, cols-1) end of
    # the chain; the serpentine map is reversed end-to-end. Set this when
    # the data line enters the strip from the corner opposite where you
    # want logical (0,0) to live.
    #
    # Note this is a 180-degree rotation only because grid_rows is odd. With
    # an even row count the reversal lands on the opposite row parity and the
    # result is a vertical flip instead. Re-check the mapping if the grid
    # geometry ever changes.
    reverse_chain: bool = False




class LEDMode(Enum):
    """LED operation modes"""
    INTERACTIVE = "interactive"
    VISUALIZATION = "visualization"
    OFF = "off"


class LEDController:
    """LED controller with interactive and visualization modes"""

    def __init__(self, config: Optional[LEDConfig] = None):
        self.config = config or LEDConfig()
        self._pixels = None
        self._current_indices: Set[int] = set()  # Track which LEDs are currently on
        self._selected_index: Optional[int] = None
        self._mode = LEDMode.OFF  # Start with LEDs off for safety
        self._visualization_engine = None
        self._global_brightness = 0.1  # Default 10% brightness
        self._beacon_index: Optional[int] = None
        
        # Initialize hardware if available
        if not self.config.mock_mode:
            try:
                import board
                import neopixel
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
                global HARDWARE_AVAILABLE
                HARDWARE_AVAILABLE = True
            except Exception as e:
                logger.info(f"LED hardware not available, using mock mode: {e}")
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
            physical = row * self.config.grid_cols + col
        else:
            physical = row * self.config.grid_cols + (self.config.grid_cols - 1 - col)

        if self.config.reverse_chain:
            physical = self.config.num_pixels - 1 - physical

        return physical
    
    async def update_interactive_mode(self, entries: List[Dict]):
        """
        Update LEDs for interactive mode
        Only shows filtered entries, with selected entry brighter
        
        Args:
            entries: List of dicts with keys:
                - index: Grid position (0 to num_pixels-1)
                - color: Hex color string
                - isSelected: Boolean
        """
        # Only update if in interactive mode
        if self._mode != LEDMode.INTERACTIVE:
            logger.debug("Skipping interactive update - not in interactive mode")
            return
        
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
            
            # Apply brightness (combine global brightness with selection brightness)
            base_brightness = self.config.brightness_selected if is_selected else self.config.brightness_filtered
            effective_brightness = base_brightness * self._global_brightness
            rgb_with_brightness = tuple(int(c * effective_brightness) for c in rgb)
            
            await self._set_pixel(index, rgb_with_brightness)
        
        # Update tracking
        self._current_indices = new_indices
        self._selected_index = new_selected
        
        # Show changes
        if self._pixels:
            self._pixels.show()
        
    
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
        
        # Only clear tracking for interactive mode
        if self._mode == LEDMode.INTERACTIVE:
            self._current_indices.clear()
            self._selected_index = None
        
        logger.debug("All LEDs cleared")
    
    async def set_brightness(self, brightness: float):
        """
        Set global brightness for all LEDs

        Args:
            brightness: Value from 0.0 to 1.0
        """
        self._global_brightness = max(0.05, min(1.0, brightness))  # Clamp between 5% and 100%
        logger.info(f"Global brightness set to: {self._global_brightness:.0%}")

        # If in interactive mode, refresh current LEDs with new brightness
        if self._mode == LEDMode.INTERACTIVE and self._current_indices:
            # Re-apply brightness to currently lit LEDs by triggering a refresh
            # This will be handled by the next update
            pass

    async def show_placement_beacon(self, logical_index: int,
                                    color: Tuple[int, int, int] = (255, 255, 255),
                                    brightness: float = 0.6) -> bool:
        """Light a single cell to show where a box should be placed.

        Deliberately ignores the current LED mode. The grid defaults to off on
        purpose (it is bright, and self-activating is disruptive), but during
        registration the user has explicitly asked where this sample goes, so
        one cell lighting up is the intent. Only that cell is touched, and the
        mode is left unchanged so nothing resumes when the beacon clears.
        """
        if self._pixels is None:
            logger.warning("Placement beacon requested but no LED hardware")
            return False
        if not 0 <= logical_index < self.config.num_pixels:
            logger.error(f"Beacon index {logical_index} out of range "
                         f"(0-{self.config.num_pixels - 1})")
            return False

        await self.clear_placement_beacon()

        rgb = tuple(int(c * max(0.0, min(1.0, brightness))) for c in color)
        physical = self._get_pixel_index(logical_index)
        self._pixels[physical] = rgb
        self._pixels.show()
        self._beacon_index = logical_index
        logger.info(f"Placement beacon: cell {logical_index} "
                    f"(row {logical_index // self.config.grid_cols}, "
                    f"col {logical_index % self.config.grid_cols}) -> LED {physical}")
        return True

    async def clear_placement_beacon(self) -> None:
        """Turn off the beacon cell, leaving everything else as it was."""
        idx = getattr(self, '_beacon_index', None)
        if idx is None or self._pixels is None:
            self._beacon_index = None
            return
        # Only darken it if nothing else is meant to be lit there.
        if idx not in self._current_indices:
            self._pixels[self._get_pixel_index(idx)] = (0, 0, 0)
            self._pixels.show()
        self._beacon_index = None

    async def set_mode(self, mode: LEDMode):
        """Switch between interactive, visualization, and off modes"""
        if self._mode == mode:
            return

        # Stop visualization if switching away from it
        if self._mode == LEDMode.VISUALIZATION and self._visualization_engine:
            await self._visualization_engine.stop_visualization()

        self._mode = mode

        # Handle mode-specific initialization
        if mode == LEDMode.OFF:
            # Turn off all LEDs and keep them off
            await self.clear_all()
        elif mode == LEDMode.VISUALIZATION:
            # Clear all LEDs when entering visualization mode
            await self.clear_all()
        elif mode == LEDMode.INTERACTIVE:
            # When switching to interactive mode from visualization or off
            # The visualization engine should have already cleared its pixels when stopping
            # Just reset our tracking state
            self._current_indices.clear()
            self._selected_index = None
            logger.info("Switched to interactive mode, ready for new data")

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
        _controller = LEDController(led_config_from_env())
    return _controller


def _env_flag(name: str, default: bool = False) -> bool:
    """Read a boolean environment variable"""
    import os
    return os.getenv(name, str(default)).strip().lower() in ('true', '1', 'yes', 'on')


def led_config_from_env() -> LEDConfig:
    """Build LEDConfig from environment, falling back to the dataclass defaults"""
    import os

    defaults = LEDConfig()
    config = LEDConfig(
        num_pixels=int(os.getenv('LED_NUM_PIXELS', defaults.num_pixels)),
        grid_rows=int(os.getenv('LED_GRID_ROWS', defaults.grid_rows)),
        grid_cols=int(os.getenv('LED_GRID_COLS', defaults.grid_cols)),
        mock_mode=_env_flag('LED_MOCK_MODE'),
        reverse_chain=_env_flag('LED_REVERSE_CHAIN'),
    )

    if config.grid_rows * config.grid_cols != config.num_pixels:
        raise ValueError(
            f"LED grid geometry mismatch: grid_rows({config.grid_rows}) * "
            f"grid_cols({config.grid_cols}) != num_pixels({config.num_pixels})"
        )

    logger.info(
        "LED config: %d pixels (%dx%d), reverse_chain=%s, mock_mode=%s",
        config.num_pixels, config.grid_rows, config.grid_cols,
        config.reverse_chain, config.mock_mode,
    )
    return config