#!/usr/bin/env python3
"""
LED Visualization Patterns for NFC Collection
Provides various data visualization modes for the LED grid
"""

import asyncio
import math
import time
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from enum import Enum

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


class TypeDistributionVisualization:
    """
    Visualization showing sand type distribution
    Slowly ramps brightness up and down for each type
    """
    
    # Define sand types and their colors (matching actual entry types)
    TYPE_COLORS = {
        'Beach': '#F4A460',       # Sandy Brown
        'River': '#4682B4',       # Steel Blue  
        'Mountain': '#8B7355',    # Burlywood4
        'Desert': '#DEB887',      # Burlewood
        'Lake': '#5F9EA0',        # Cadet Blue
        'Ruin': '#CD853F',        # Peru
        'Glacial': '#B0E0E6',     # Powder Blue
        'Volcanic': '#2F4F4F',    # Dark Slate Gray
        '': '#808080',            # Gray for unknown/empty types
    }
    
    def __init__(self, entries: List[Dict], total_pixels: int = 100):
        self.entries = entries
        self.total_pixels = total_pixels
        self.type_counts = self._calculate_type_distribution()
        self.current_type_index = 0
        self.types = list(self.TYPE_COLORS.keys())
        
    def _calculate_type_distribution(self) -> Dict[str, int]:
        """Calculate how many entries of each type we have"""
        counts = {}
        for entry in self.entries:
            entry_type = entry.get('type', 'Unknown')
            counts[entry_type] = counts.get(entry_type, 0) + 1
        return counts
    
    def _hex_to_rgb(self, hex_color: str) -> Tuple[int, int, int]:
        """Convert hex color to RGB"""
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    
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
            # Get color for this type with debug
            color = self.TYPE_COLORS.get(current_type, '#FFFFFF')
            if color == '#FFFFFF':
                logger.warning(f"No color defined for type '{current_type}', using white")
            rgb = self._hex_to_rgb(color)
            
            # Apply brightness
            rgb_with_brightness = tuple(int(c * brightness) for c in rgb)
            
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
                    for idx, rgb in frame.pixels:
                        if 0 <= idx < self.led_controller.config.num_pixels:
                            physical_idx = self.led_controller._get_pixel_index(idx)
                            self.led_controller._pixels[physical_idx] = rgb
                            pixel_count += 1
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