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
    CHRONOLOGY = "chronology"
    REGION_MAP = "region_map"


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
    
    # Sand type colors - Using same LED-optimized colors as interactive mode
    SAND_TYPE_COLORS = {
        'Beach': (255, 200, 0),       # Strong golden yellow
        'River': (40, 70, 255),       # Intense deep blue  
        'Mountain': (50, 255, 100),   # Vivid spring green
        'Desert': (255, 40, 20),      # Hot coral red-orange
        'Lake': (0, 255, 255),        # Electric cyan
        'Ruin': (220, 40, 255),       # Bright magenta-violet
        '': (128, 128, 128),          # Gray for unknown/empty types
    }
    
    @staticmethod
    def hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
        """Convert hex color to RGB tuple"""
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    
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
    Visualization showing sand type distribution.

    Cycles through each sand type, gradually ramping brightness up and down
    to highlight entries of that type. Each type gets equal time in the cycle.

    Attributes:
        entries: List of entry dictionaries with type and index fields
        total_pixels: Total number of LED pixels available
        types: Sorted list of unique sand types found in entries
    """

    def __init__(self, entries: List[Dict], total_pixels: int = 100):
        """
        Initialize the type distribution visualization.

        Args:
            entries: List of entry dictionaries
            total_pixels: Total number of LED pixels
        """
        self.entries = entries
        self.total_pixels = total_pixels
        self.type_counts = self._calculate_type_distribution()
        self.current_type_index = 0
        # Get unique types from actual data, excluding empty strings
        self.types = list(set(entry.get('type', '') for entry in entries if entry.get('type')))
        # Sort for consistent ordering
        self.types.sort()
        
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
        
        
        if type_entries:
            # Get RGB color for this type using ColorManager
            rgb = ColorManager.get_type_color(current_type)
            
            # Apply brightness to the color
            rgb_with_brightness = ColorManager.apply_brightness(rgb, brightness)
            
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


class ChronologyVisualization:
    """
    Visualization showing timeline of collection by year.

    Progressively lights up entries year by year, with the current year
    highlighted brightly before fading to a baseline brightness. Previous
    years remain visible at the baseline level, creating a cumulative effect.

    Attributes:
        entries: List of entry dictionaries with creationDate fields
        total_pixels: Total number of LED pixels available
        years: Sorted list of years found in entries
        baseline_brightness: Dim brightness level for non-highlighted years
    """

    def __init__(self, entries: List[Dict], total_pixels: int = 100):
        """
        Initialize the chronology visualization.

        Args:
            entries: List of entry dictionaries
            total_pixels: Total number of LED pixels
        """
        self.entries = entries
        self.total_pixels = total_pixels
        self.entries_by_year = self._organize_by_year()
        self.years = sorted(self.entries_by_year.keys()) if self.entries_by_year else []
        self.baseline_brightness = 0.15  # Baseline after highlighting

    def _organize_by_year(self) -> Dict[int, List[Dict]]:
        """Organize entries by year"""
        by_year = {}
        for entry in self.entries:
            date_str = entry.get('creationDate', '')
            if date_str:
                try:
                    year = int(date_str.split('-')[0])
                    if year not in by_year:
                        by_year[year] = []
                    by_year[year].append(entry)
                except (ValueError, IndexError):
                    pass
        return by_year

    def generate_frame(self, phase: float) -> VisualizationFrame:
        """
        Generate a frame showing year-by-year progression
        phase: 0.0 to 1.0 representing position in the animation cycle
        """
        pixels = []

        if not self.years:
            return VisualizationFrame(pixels=[], duration_ms=50)

        # Add a "reset" phase at the beginning where all LEDs are off
        reset_duration = 0.1  # 10% of cycle for reset
        if phase < reset_duration:
            # All LEDs off during reset
            return VisualizationFrame(pixels=[], duration_ms=50)

        # Adjust phase for the remaining time
        adjusted_phase = (phase - reset_duration) / (1.0 - reset_duration)

        # Each year gets equal time in the remaining cycle
        time_per_year = 1.0 / len(self.years)

        # Determine which year we're currently highlighting
        current_year_index = min(int(adjusted_phase / time_per_year), len(self.years) - 1)
        local_phase = (adjusted_phase % time_per_year) / time_per_year

        # Phase within the year: ramp up, hold, fade to baseline
        if local_phase < 0.2:  # Ramp up (20% of year time)
            highlight_brightness = local_phase / 0.2
        elif local_phase < 0.6:  # Hold at full brightness (40% of year time)
            highlight_brightness = 1.0
        else:  # Fade to baseline (40% of year time)
            fade_phase = (local_phase - 0.6) / 0.4
            highlight_brightness = 1.0 - (fade_phase * (1.0 - self.baseline_brightness))

        # Light up all entries up to and including current year
        for year_idx, year in enumerate(self.years):
            if year_idx <= current_year_index:
                year_entries = self.entries_by_year[year]

                # Determine brightness for this year's entries
                if year_idx == current_year_index:
                    # Current year uses animated brightness
                    brightness = highlight_brightness * 0.8  # Max 80% brightness
                else:
                    # Previous years at baseline
                    brightness = self.baseline_brightness

                # Get color based on entry type for visual variety
                for entry in year_entries:
                    index = entry.get('index')
                    if index is not None and 0 <= index < self.total_pixels:
                        entry_type = entry.get('type', '')
                        rgb = ColorManager.get_type_color(entry_type)
                        rgb_with_brightness = ColorManager.apply_brightness(rgb, brightness)
                        pixels.append((index, rgb_with_brightness))

        return VisualizationFrame(
            pixels=pixels,
            duration_ms=50
        )


class RegionVisualization:
    """
    Visualization showing geographic distribution by region.

    Cycles through geographic regions, highlighting entries from each region
    with a unique color. If region data is not available, falls back to
    grouping by sand type for a meaningful display.

    Attributes:
        entries: List of entry dictionaries with region or location fields
        total_pixels: Total number of LED pixels available
        regions: Sorted list of regions or types (if using fallback)
    """

    def __init__(self, entries: List[Dict], total_pixels: int = 100):
        """
        Initialize the region visualization.

        Args:
            entries: List of entry dictionaries
            total_pixels: Total number of LED pixels
        """
        self.entries = entries
        self.total_pixels = total_pixels
        self.entries_by_region = self._organize_by_region()
        self.regions = sorted(self.entries_by_region.keys()) if self.entries_by_region else []

        # If we only have "Unknown" region, fall back to type-based grouping
        if self.regions == ['Unknown'] or not self.regions:
            logger.info("No region data available, falling back to type-based grouping")
            self.entries_by_region = self._organize_by_type()
            self.regions = sorted(self.entries_by_region.keys()) if self.entries_by_region else []

    def _organize_by_region(self) -> Dict[str, List[Dict]]:
        """Organize entries by region - matching frontend's approach"""
        by_region = {}
        for entry in self.entries:
            # Frontend extracts region from tags array with format "Region: X"
            # Since we're getting data from LED mode manager, check if region field exists
            region = entry.get('region', '')

            # If no region field, try location data as fallback
            if not region:
                location = entry.get('location', {})
                # Try to get region from location data - check if it's a string or dict
                if isinstance(location, str):
                    # Location might be stored as a string like "California, USA"
                    parts = location.split(',')
                    region = parts[0].strip() if parts else 'Unknown'
                elif isinstance(location, dict):
                    # Try various fields in the location dict
                    region = location.get('administrativeArea', '') or \
                            location.get('state', '') or \
                            location.get('country', '') or \
                            location.get('region', '') or \
                            location.get('name', '') or \
                            'Unknown'
                else:
                    region = 'Unknown'

            # Default to Unknown if still no region
            if not region:
                region = 'Unknown'

            if region not in by_region:
                by_region[region] = []
            by_region[region].append(entry)

        logger.info(f"Region visualization: Found {len(by_region)} regions: {list(by_region.keys())}")
        return by_region

    def _organize_by_type(self) -> Dict[str, List[Dict]]:
        """Fallback: Organize entries by type when region data isn't available"""
        by_type = {}
        for entry in self.entries:
            entry_type = entry.get('type', 'Unknown')
            if entry_type not in by_type:
                by_type[entry_type] = []
            by_type[entry_type].append(entry)

        logger.info(f"Region visualization fallback: Using {len(by_type)} types: {list(by_type.keys())}")
        return by_type

    def _get_region_color(self, region: str) -> Tuple[int, int, int]:
        """Get a consistent color for a region or type"""
        # Check if this is actually a sand type (when using fallback)
        if region in ColorManager.SAND_TYPE_COLORS:
            return ColorManager.SAND_TYPE_COLORS[region]

        # Use a hash-based approach for consistent colors per region
        hash_val = hash(region)
        hue = (hash_val % 360) / 360.0
        r, g, b = colorsys.hsv_to_rgb(hue, 0.8, 0.9)
        return (int(r * 255), int(g * 255), int(b * 255))

    def generate_frame(self, phase: float) -> VisualizationFrame:
        """
        Generate a frame showing region-by-region distribution
        phase: 0.0 to 1.0 representing position in the animation cycle
        """
        pixels = []

        if not self.regions:
            logger.warning("No regions found for visualization")
            return VisualizationFrame(pixels=[], duration_ms=50)

        # Determine which region we're showing
        region_phase = (phase * len(self.regions)) % len(self.regions)
        current_region = self.regions[int(region_phase)]

        # Calculate brightness ramp within region's phase
        local_phase = region_phase - int(region_phase)
        brightness = math.sin(local_phase * math.pi)  # Sine wave for smooth ramp

        # Apply brightness range (0.05 to 0.8)
        brightness = 0.05 + (brightness * 0.75)

        # Get entries for current region
        region_entries = self.entries_by_region.get(current_region, [])

        # Debug log only first time for each region
        if local_phase < 0.1:  # Log only at start of each region's cycle
            logger.debug(f"Region {current_region}: {len(region_entries)} entries, brightness {brightness:.2f}")

        if region_entries:
            # Get color for this region
            rgb = self._get_region_color(current_region)
            rgb_with_brightness = ColorManager.apply_brightness(rgb, brightness)

            # Light up pixels for entries from this region
            for entry in region_entries:
                index = entry.get('index')
                if index is not None and 0 <= index < self.total_pixels:
                    pixels.append((index, rgb_with_brightness))

        return VisualizationFrame(
            pixels=pixels,
            duration_ms=33
        )


class VisualizationScheduler:
    """
    Manages visualization rotation and scheduling.

    Controls the timing and sequencing of different visualizations,
    supporting both automatic rotation and manual selection.

    Attributes:
        visualizations: List of available visualization types
        current_index: Index of the current visualization in the rotation
        duration_seconds: How long each visualization runs before rotating
        start_time: Timestamp when current visualization started
        manual_selection: Currently manually selected visualization, if any
    """

    def __init__(self):
        """
        Initialize the visualization scheduler with default settings.
        """
        self.visualizations = [
            VisualizationType.TYPE_DISTRIBUTION,
            VisualizationType.CHRONOLOGY,
            VisualizationType.REGION_MAP
        ]
        self.current_index = 0
        self.duration_seconds = 60  # Default 60 seconds per visualization
        self.start_time = None
        self.manual_selection = None

    def set_duration(self, seconds: int):
        """Set duration for each visualization"""
        self.duration_seconds = max(10, min(300, seconds))  # Clamp between 10s and 5min

    def select_visualization(self, viz_type: VisualizationType):
        """Manually select a specific visualization"""
        if viz_type in self.visualizations:
            self.current_index = self.visualizations.index(viz_type)
            self.manual_selection = viz_type
            self.start_time = time.time()

    def get_next_visualization(self) -> VisualizationType:
        """Get the next visualization in rotation"""
        if self.manual_selection:
            # Clear manual selection and continue from there
            self.manual_selection = None
        self.current_index = (self.current_index + 1) % len(self.visualizations)
        self.start_time = time.time()
        return self.visualizations[self.current_index]

    def get_current_visualization(self) -> VisualizationType:
        """Get the current visualization"""
        return self.visualizations[self.current_index]

    def get_time_remaining(self) -> float:
        """Get time remaining for current visualization in seconds"""
        if self.start_time:
            elapsed = time.time() - self.start_time
            return max(0, self.duration_seconds - elapsed)
        return self.duration_seconds

    def should_rotate(self) -> bool:
        """Check if it's time to rotate to next visualization"""
        return self.get_time_remaining() <= 0

    def get_status(self) -> Dict:
        """Get current scheduler status"""
        current = self.get_current_visualization()
        return {
            'current_visualization': current.value,
            'visualization_name': self._get_friendly_name(current),
            'time_remaining': self.get_time_remaining(),
            'duration': self.duration_seconds,
            'available_visualizations': [
                {
                    'type': viz.value,
                    'name': self._get_friendly_name(viz)
                }
                for viz in self.visualizations
            ]
        }

    def _get_friendly_name(self, viz_type: VisualizationType) -> str:
        """Get user-friendly name for visualization"""
        names = {
            VisualizationType.TYPE_DISTRIBUTION: "Type Distribution",
            VisualizationType.CHRONOLOGY: "Timeline",
            VisualizationType.REGION_MAP: "Geographic Regions"
        }
        return names.get(viz_type, viz_type.value)


class VisualizationEngine:
    """
    Main engine for managing LED visualizations.

    Handles visualization lifecycle, rotation scheduling, and status updates
    for the LED display system. Supports multiple visualization types including
    type distribution, chronological timeline, and geographic regions.

    Attributes:
        led_controller: The LED controller instance for display operations
        scheduler: VisualizationScheduler instance for managing rotations
        running: Boolean indicating if visualizations are active
        entries_data: List of entry data for visualizations
    """

    def __init__(self, led_controller):
        """
        Initialize the visualization engine.

        Args:
            led_controller: LED controller instance for hardware control
        """
        self.led_controller = led_controller
        self.scheduler = VisualizationScheduler()
        self.current_viz = None
        self.running = False
        self.current_task = None
        self.rotation_task = None
        self.entries_data = []
        self.status_callback = None  # Callback for status updates
        
    def set_status_callback(self, callback):
        """Set callback for status updates"""
        self.status_callback = callback

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
                    'region': entry.get('region', ''),  # Include region field
                    'creationDate': entry.get('creationDate')
                }
                self.entries_data.append(entry_data)

    async def start_rotation(self):
        """Start visualization rotation cycle"""
        await self.stop_visualization()

        self.running = True
        logger.info("Starting visualization rotation")

        # Initialize the scheduler's start time
        self.scheduler.start_time = time.time()

        # Start rotation task
        self.rotation_task = asyncio.create_task(self._rotation_loop())

    async def start_specific_visualization(self, viz_type: VisualizationType):
        """Start a specific visualization (manual selection)"""
        await self.stop_visualization()

        self.scheduler.select_visualization(viz_type)
        self.running = True

        logger.info(f"Manually starting {viz_type.value} visualization")

        # Start rotation from selected visualization
        self.rotation_task = asyncio.create_task(self._rotation_loop())

    def set_duration(self, seconds: int):
        """Set visualization duration"""
        self.scheduler.set_duration(seconds)
        logger.info(f"Set visualization duration to {seconds} seconds")

    def get_status(self) -> Dict:
        """Get current visualization status"""
        return self.scheduler.get_status()
    
    async def stop_visualization(self):
        """Stop current visualization"""
        self.running = False

        # Cancel tasks
        for task in [self.current_task, self.rotation_task]:
            if task:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

        self.current_task = None
        self.rotation_task = None

        # Clear all LEDs
        await self.led_controller.clear_all()

    async def _rotation_loop(self):
        """Main rotation loop for visualizations.

        Continuously cycles through visualizations based on the scheduler's
        duration settings. Sends status updates to the frontend via callbacks.

        Raises:
            asyncio.CancelledError: When the rotation is stopped
        """
        try:
            while self.running:
                # Get current visualization
                viz_type = self.scheduler.get_current_visualization()

                # Run current visualization
                self.current_task = asyncio.create_task(
                    self._run_single_visualization(viz_type)
                )

                # Send status update
                if self.status_callback:
                    try:
                        await self.status_callback(self.get_status())
                    except Exception as e:
                        logger.error(f"Error sending status update: {e}")

                # Wait for duration or cancellation
                while self.running and not self.scheduler.should_rotate():
                    await asyncio.sleep(1)  # Check every second

                    # Send periodic status updates
                    if self.status_callback:
                        try:
                            await self.status_callback(self.get_status())
                        except Exception as e:
                            logger.error(f"Error sending periodic status: {e}")

                # Cancel current visualization
                if self.current_task:
                    self.current_task.cancel()
                    try:
                        await self.current_task
                    except asyncio.CancelledError:
                        pass
                    self.current_task = None

                # Move to next visualization
                if self.running:
                    self.scheduler.get_next_visualization()

        except asyncio.CancelledError:
            logger.info("Visualization rotation cancelled")
            raise
        except Exception as e:
            logger.error(f"Error in rotation loop: {e}", exc_info=True)
            self.running = False

    async def _run_single_visualization(self, viz_type: VisualizationType):
        """Run a single visualization.

        Args:
            viz_type: The type of visualization to run

        Raises:
            asyncio.CancelledError: When the visualization is stopped
        """
        try:
            # Check if LED hardware is available
            if not self.led_controller._pixels:
                logger.error("LED hardware not available for visualization")
                return

            # Check if we have data to visualize
            if not self.entries_data:
                logger.warning("No entries data available for visualization")
                return

            # Create appropriate visualization instance
            if viz_type == VisualizationType.TYPE_DISTRIBUTION:
                viz = TypeDistributionVisualization(self.entries_data)
                cycle_duration = 15.0  # 15 seconds to cycle through all types
            elif viz_type == VisualizationType.CHRONOLOGY:
                viz = ChronologyVisualization(self.entries_data)
                cycle_duration = 30.0  # 30 seconds for full timeline
            elif viz_type == VisualizationType.REGION_MAP:
                viz = RegionVisualization(self.entries_data)
                cycle_duration = 20.0  # 20 seconds to cycle through regions
            else:
                logger.error(f"Unknown visualization type: {viz_type}")
                return

            logger.info(f"Running {viz_type.value} visualization")

            # Animation loop
            start_time = time.time()

            while self.running:
                # Calculate phase (0.0 to 1.0)
                elapsed = time.time() - start_time
                phase = (elapsed % cycle_duration) / cycle_duration

                # Generate and display frame
                frame = viz.generate_frame(phase)

                # Update LEDs efficiently
                frame_indices = {idx for idx, _ in frame.pixels}

                # Turn off LEDs that aren't in this frame
                all_indices = set(range(self.led_controller.config.num_pixels))
                for idx in all_indices - frame_indices:
                    physical_idx = self.led_controller._get_pixel_index(idx)
                    self.led_controller._pixels[physical_idx] = (0, 0, 0)

                # Set pixels for this frame
                for idx, rgb in frame.pixels:
                    if 0 <= idx < self.led_controller.config.num_pixels:
                        physical_idx = self.led_controller._get_pixel_index(idx)
                        # Apply global brightness
                        brightness = self.led_controller._global_brightness
                        rgb_with_brightness = tuple(int(c * brightness) for c in rgb)
                        self.led_controller._pixels[physical_idx] = rgb_with_brightness

                # Show the frame
                self.led_controller._pixels.show()

                # Wait for frame duration
                await asyncio.sleep(frame.duration_ms / 1000.0)

        except asyncio.CancelledError:
            logger.info(f"Visualization {viz_type.value} cancelled")
            raise
        except Exception as e:
            logger.error(f"Error in visualization {viz_type.value}: {e}", exc_info=True)