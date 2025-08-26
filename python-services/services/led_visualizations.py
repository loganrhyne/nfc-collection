#!/usr/bin/env python3
"""
LED Visualization Patterns for NFC Collection
Provides various data visualization modes for the LED grid
"""

import asyncio
import math
import time
from typing import List, Dict, Tuple, Optional, Union, Callable
from dataclasses import dataclass
from enum import Enum
import colorsys

import logging
logger = logging.getLogger(__name__)


class VisualizationType(Enum):
    """Available visualization types"""
    TYPE_DISTRIBUTION = "type_distribution"
    GEOGRAPHIC_HEAT = "geographic_heat"
    TIMELINE_WAVE = "timeline_wave"
    COLOR_WAVES = "color_waves"


@dataclass
class VisualizationFrame:
    """Single frame of LED data for visualization"""
    pixels: List[Tuple[int, Tuple[int, int, int]]]  # List of (index, rgb)
    duration_ms: int = 50  # How long to display this frame


class ColorManager:
    """
    Flexible color management for visualizations
    Supports multiple color schemes and mappings
    """
    
    # Sand type colors
    SAND_TYPE_COLORS = {
        'Beach': (244, 164, 96),      # Sandy Brown
        'River': (70, 130, 180),      # Steel Blue  
        'Mountain': (139, 115, 85),   # Burlywood4
        'Desert': (222, 184, 135),    # Burlewood
        'Lake': (95, 158, 160),       # Cadet Blue
        'Ruin': (205, 133, 63),       # Peru
        'Glacial': (176, 224, 230),   # Powder Blue
        'Volcanic': (47, 79, 79),     # Dark Slate Gray
        '': (128, 128, 128),          # Gray for unknown/empty types
    }
    
    @staticmethod
    def get_type_color(sand_type: str) -> Tuple[int, int, int]:
        """Get RGB color for a sand type"""
        return ColorManager.SAND_TYPE_COLORS.get(sand_type, (255, 255, 255))
    
    @staticmethod
    def get_heatmap_color(value: float, min_val: float = 0.0, max_val: float = 1.0) -> Tuple[int, int, int]:
        """
        Get heatmap color for a normalized value
        Uses HSV color space for smooth gradients
        """
        # Normalize value to 0-1 range
        normalized = (value - min_val) / (max_val - min_val) if max_val > min_val else 0.5
        normalized = max(0.0, min(1.0, normalized))
        
        # HSV: Hue from blue (240°) to red (0°)
        hue = (1.0 - normalized) * 240.0 / 360.0
        saturation = 0.8
        value = 0.8
        
        # Convert HSV to RGB
        r, g, b = colorsys.hsv_to_rgb(hue, saturation, value)
        return (int(r * 255), int(g * 255), int(b * 255))
    
    @staticmethod
    def get_gradient_color(phase: float, color1: Tuple[int, int, int], 
                          color2: Tuple[int, int, int]) -> Tuple[int, int, int]:
        """Interpolate between two colors based on phase (0.0 to 1.0)"""
        return tuple(
            int(color1[i] + (color2[i] - color1[i]) * phase)
            for i in range(3)
        )
    
    @staticmethod
    def apply_brightness(rgb: Tuple[int, int, int], brightness: float) -> Tuple[int, int, int]:
        """Apply brightness multiplier to RGB color"""
        return tuple(int(c * brightness) for c in rgb)


class TypeDistributionVisualization:
    """
    Visualization showing sand type distribution
    Slowly ramps brightness up and down for each type
    """
    
    def __init__(self, entries: List[Dict], total_pixels: int = 100):
        self.entries = entries
        self.total_pixels = total_pixels
        self.type_counts = self._calculate_type_distribution()
        self.current_type_index = 0
        # Get unique types from actual data, excluding empty strings
        self.types = list(set(entry.get('type', '') for entry in entries if entry.get('type')))
        # Sort for consistent ordering
        self.types.sort()
        logger.info(f"Visualization initialized with types from data: {self.types}")
        
        # Log which types have defined colors
        for t in self.types:
            color = ColorManager.get_type_color(t)
            logger.info(f"  Type '{t}' -> RGB{color}")
        
    def _calculate_type_distribution(self) -> Dict[str, int]:
        """Calculate how many entries of each type we have"""
        counts = {}
        for entry in self.entries:
            entry_type = entry.get('type', 'Unknown')
            counts[entry_type] = counts.get(entry_type, 0) + 1
        return counts
    
    def generate_frame(self, phase: float) -> VisualizationFrame:
        """
        Generate a single frame of the visualization
        phase: 0.0 to 1.0 representing position in the animation cycle
        """
        pixels = []
        
        # Determine which type we're showing
        type_phase = (phase * len(self.types)) % len(self.types)
        current_type = self.types[int(type_phase)]
        
        # Calculate brightness ramp (0 -> 1 -> 0) within each type's phase
        local_phase = type_phase - int(type_phase)
        brightness = math.sin(local_phase * math.pi)  # Sine wave for smooth ramp
        
        # Apply brightness range matching interactive mode
        # Range from 0.05 (background) to 0.8 (selected)
        brightness = 0.05 + (brightness * 0.75)  # 0.05 to 0.8
        
        # Get entries of current type
        type_entries = [e for e in self.entries if e.get('type') == current_type]
        
        # Log current state
        if len(type_entries) > 0:
            logger.debug(f"Showing type '{current_type}' with {len(type_entries)} entries at brightness {brightness:.2f}")
        
        if type_entries:
            # Get RGB color for this type using ColorManager
            rgb = ColorManager.get_type_color(current_type)
            if current_type not in ColorManager.SAND_TYPE_COLORS:
                logger.warning(f"No color defined for type '{current_type}', using white")
            
            # Log raw RGB and brightness-applied RGB
            rgb_with_brightness = ColorManager.apply_brightness(rgb, brightness)
            logger.debug(f"Type '{current_type}' -> RGB {rgb} -> Brightness {brightness:.2f} -> Final RGB {rgb_with_brightness}")
            
            # Light up pixels for entries of this type
            for entry in type_entries:
                index = entry.get('index')
                if index is not None and 0 <= index < self.total_pixels:
                    pixels.append((index, rgb_with_brightness))
        
        # Skip glow effect for now to reduce flicker
        all_pixels = {idx: rgb for idx, rgb in pixels}
        
        return VisualizationFrame(
            pixels=list(all_pixels.items()),
            duration_ms=33  # ~30fps for smoother animation
        )


class VisualizationEngine:
    """
    Main engine for running LED visualizations
    """
    
    def __init__(self, led_controller):
        self.led_controller = led_controller
        self.current_mode = None
        self.running = False
        self.current_task = None
        self.entries_data = []
        
    def update_entries(self, entries: List[Dict]):
        """Update the entries data used for visualizations"""
        # Sort by oldest first and add indices
        sorted_entries = sorted(entries, key=lambda e: e.get('creationDate', ''))
        
        self.entries_data = []
        for idx, entry in enumerate(sorted_entries):
            if idx < self.led_controller.config.num_pixels:
                entry_data = {
                    'index': idx,
                    'type': entry.get('type'),
                    'title': entry.get('title'),
                    'location': entry.get('location', {}),
                    'creationDate': entry.get('creationDate')
                }
                self.entries_data.append(entry_data)
    
    async def start_visualization(self, viz_type: VisualizationType):
        """Start a specific visualization"""
        await self.stop_visualization()
        
        self.current_mode = viz_type
        self.running = True
        
        logger.info(f"Starting visualization {viz_type.value} with {len(self.entries_data)} entries")
        
        # Log entry types for debugging
        type_counts = {}
        for entry in self.entries_data:
            entry_type = entry.get('type', 'Unknown')
            type_counts[entry_type] = type_counts.get(entry_type, 0) + 1
        logger.info(f"Entry types: {type_counts}")
        
        # Start the visualization task
        self.current_task = asyncio.create_task(self._run_visualization(viz_type))
    
    async def stop_visualization(self):
        """Stop current visualization"""
        self.running = False
        
        if self.current_task:
            self.current_task.cancel()
            try:
                await self.current_task
            except asyncio.CancelledError:
                pass
            self.current_task = None
        
        # Clear all LEDs
        await self.led_controller.clear_all()
    
    async def _run_visualization(self, viz_type: VisualizationType):
        """Run the visualization loop"""
        try:
            if viz_type == VisualizationType.TYPE_DISTRIBUTION:
                viz = TypeDistributionVisualization(self.entries_data)
                
                # Animation loop
                start_time = time.time()
                cycle_duration = 15.0  # 15 seconds to cycle through all types
                
                # Check if LED hardware is available
                if not self.led_controller._pixels:
                    logger.error("LED hardware not available for visualization")
                    return
                
                logger.info(f"Starting {viz_type.value} animation loop")
                
                while self.running:
                    # Calculate phase (0.0 to 1.0)
                    elapsed = time.time() - start_time
                    phase = (elapsed % cycle_duration) / cycle_duration
                    
                    # Generate and display frame
                    frame = viz.generate_frame(phase)
                    
                    # Log frame info for debugging
                    if len(frame.pixels) > 0:
                        logger.debug(f"Frame has {len(frame.pixels)} pixels to light")
                    
                    # Don't clear all LEDs - just update what needs to change
                    # First, create a set of current frame indices
                    frame_indices = {idx for idx, _ in frame.pixels}
                    
                    # Turn off LEDs that aren't in this frame
                    all_indices = set(range(self.led_controller.config.num_pixels))
                    for idx in all_indices - frame_indices:
                        physical_idx = self.led_controller._get_pixel_index(idx)
                        self.led_controller._pixels[physical_idx] = (0, 0, 0)
                    
                    # Set pixels for this frame
                    pixel_count = 0
                    first_pixel_debug = True
                    for idx, rgb in frame.pixels:
                        if 0 <= idx < self.led_controller.config.num_pixels:
                            physical_idx = self.led_controller._get_pixel_index(idx)
                            self.led_controller._pixels[physical_idx] = rgb
                            pixel_count += 1
                            # Log first pixel for debug
                            if first_pixel_debug:
                                logger.debug(f"Setting pixel {idx} (physical {physical_idx}) to RGB{rgb}")
                                first_pixel_debug = False
                        else:
                            logger.warning(f"Pixel index {idx} out of range")
                    
                    # Show the frame
                    self.led_controller._pixels.show()
                    if pixel_count > 0:
                        logger.debug(f"Visualization: Set {pixel_count} pixels, showing frame")
                    
                    # Wait for frame duration
                    await asyncio.sleep(frame.duration_ms / 1000.0)
            
            # Add other visualization types here
            
        except asyncio.CancelledError:
            logger.info(f"Visualization {viz_type.value} cancelled")
            raise
        except Exception as e:
            logger.error(f"Error in visualization {viz_type.value}: {e}", exc_info=True)