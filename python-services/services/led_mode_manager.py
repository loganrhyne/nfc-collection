#!/usr/bin/env python3
"""
LED Mode Manager - Centralized state management for LED modes
"""

import asyncio
import logging
from typing import Optional, List, Dict
from enum import Enum
from datetime import datetime, timedelta
from services.led_controller import LEDController, LEDMode
from services.led_visualizations import VisualizationType

logger = logging.getLogger(__name__)


class LEDModeManager:
    """
    Manages LED mode transitions and state
    Ensures consistent state between Python backend and React frontend
    """
    
    def __init__(self, led_controller: LEDController):
        self.led_controller = led_controller
        self._current_mode = LEDMode.OFF  # Start with LEDs off for safety
        self._visualization_task = None
        self._entries_data = []
        self._status_callback = None  # For sending status updates to frontend
        self._auto_off_task = None  # Task for auto-off timer
        self._visualization_start_time = None  # Track when visualization started

        # Auto-off duration from environment variable or default to 15 minutes
        import os
        self._auto_off_duration = int(os.getenv('LED_AUTO_OFF_MINUTES', '15')) * 60
        
    async def set_mode(self, mode: LEDMode, auto_start_viz: bool = True) -> Dict:
        """
        Set LED mode with proper cleanup and initialization
        Returns status dict for frontend sync
        """
        logger.info(f"Setting LED mode to: {mode.value}")

        # If already in this mode, just return status
        if self._current_mode == mode:
            return self.get_status()

        # Clean up current mode
        if self._current_mode == LEDMode.VISUALIZATION:
            await self._stop_visualization()
            await self._cancel_auto_off()

        # Set new mode - this is now simplified
        self._current_mode = mode

        # Update the controller mode without clearing
        # The controller's set_mode is updated to only clear when going TO visualization
        await self.led_controller.set_mode(mode)

        # Initialize visualization if needed
        if mode == LEDMode.VISUALIZATION and auto_start_viz:
            await self._start_visualization()
            await self._start_auto_off_timer()  # Start the auto-off timer

            # Send visualization status immediately after starting
            if self._status_callback:
                viz_engine = self.led_controller.get_visualization_engine()
                viz_status = viz_engine.get_status()
                await self._status_callback(viz_status)
        elif mode == LEDMode.OFF:
            # When switching to OFF mode, ensure all LEDs are turned off
            await self.led_controller.clear_all()
            await self._cancel_auto_off()

        return self.get_status()
    
    async def update_entries(self, entries: List[Dict]):
        """Update entries data for visualizations"""
        self._entries_data = entries
        
        # If in visualization mode, update the engine
        if self._current_mode == LEDMode.VISUALIZATION:
            viz_engine = self.led_controller.get_visualization_engine()
            viz_engine.update_entries(entries)
    
    def set_status_callback(self, callback):
        """Set callback for sending status updates to frontend"""
        self._status_callback = callback
        # Also set it on the visualization engine
        viz_engine = self.led_controller.get_visualization_engine()
        viz_engine.set_status_callback(callback)

    async def _start_visualization(self):
        """Start visualization rotation cycle"""
        if self._visualization_task:
            await self._stop_visualization()

        # Update entries in visualization engine
        viz_engine = self.led_controller.get_visualization_engine()
        viz_engine.update_entries(self._entries_data)

        # Start rotation
        await viz_engine.start_rotation()
        logger.info("Started visualization rotation")

        # Give the engine a moment to initialize
        await asyncio.sleep(0.1)

    async def select_visualization(self, viz_type_str: str):
        """Manually select a specific visualization"""
        try:
            from services.led_visualizations import VisualizationType
            viz_type = VisualizationType(viz_type_str)

            viz_engine = self.led_controller.get_visualization_engine()
            await viz_engine.start_specific_visualization(viz_type)
            logger.info(f"Manually selected {viz_type_str} visualization")

            # Restart auto-off timer on user interaction
            if self._current_mode == LEDMode.VISUALIZATION:
                await self._start_auto_off_timer()
        except ValueError:
            logger.error(f"Unknown visualization type: {viz_type_str}")

    async def set_visualization_duration(self, seconds: int):
        """Set visualization rotation duration"""
        viz_engine = self.led_controller.get_visualization_engine()
        viz_engine.set_duration(seconds)
        logger.info(f"Set visualization duration to {seconds} seconds")
    
    async def _stop_visualization(self):
        """Stop visualization and clean up"""
        viz_engine = self.led_controller.get_visualization_engine()
        await viz_engine.stop_visualization()
        logger.info("Stopped visualization")
    
    def get_status(self) -> Dict:
        """Get current status for frontend sync"""
        base_status = self.led_controller.get_status()

        status = {
            **base_status,
            'current_mode': self._current_mode.value,
            'has_entries': len(self._entries_data) > 0,
        }

        # Add visualization status if in visualization mode
        if self._current_mode == LEDMode.VISUALIZATION:
            viz_engine = self.led_controller.get_visualization_engine()
            viz_status = viz_engine.get_status()
            status['visualization'] = viz_status

            # Add auto-off timer info
            remaining_time = self.get_remaining_time()
            if remaining_time is not None:
                status['auto_off_remaining'] = remaining_time
                status['auto_off_enabled'] = True
            else:
                status['auto_off_enabled'] = False

        return status
    
    async def handle_interactive_update(self, entries: List[Dict]):
        """Handle LED update for interactive mode"""
        if self._current_mode != LEDMode.INTERACTIVE:
            logger.warning("Received interactive update while not in interactive mode")
            return

        # Don't process updates if LEDs are turned off
        if self._current_mode == LEDMode.OFF:
            return

        await self.led_controller.update_interactive_mode(entries)
    
    async def clear_all(self):
        """Clear all LEDs"""
        await self.led_controller.clear_all()

    async def _start_auto_off_timer(self):
        """Start the auto-off timer for visualization mode"""
        await self._cancel_auto_off()  # Cancel any existing timer

        self._visualization_start_time = datetime.now()
        self._auto_off_task = asyncio.create_task(self._auto_off_countdown())
        logger.info(f"Started auto-off timer: LEDs will turn off in {self._auto_off_duration} seconds")

    async def _cancel_auto_off(self):
        """Cancel the auto-off timer"""
        if self._auto_off_task and not self._auto_off_task.done():
            self._auto_off_task.cancel()
            self._auto_off_task = None
            self._visualization_start_time = None
            logger.info("Cancelled auto-off timer")

    async def _auto_off_countdown(self):
        """Countdown task that turns off LEDs after the duration"""
        try:
            await asyncio.sleep(self._auto_off_duration)
            logger.info("Auto-off timer expired, turning off LEDs")
            await self.set_mode(LEDMode.OFF)

            # Send status update to frontend if callback is set
            if self._status_callback:
                status = self.get_status()
                await self._status_callback({
                    'auto_off_triggered': True,
                    'message': 'LEDs automatically turned off after 15 minutes',
                    **status
                })
        except asyncio.CancelledError:
            logger.debug("Auto-off timer was cancelled")

    def get_remaining_time(self) -> Optional[int]:
        """Get remaining time in seconds before auto-off, or None if not active"""
        if self._visualization_start_time and self._current_mode == LEDMode.VISUALIZATION:
            elapsed = (datetime.now() - self._visualization_start_time).total_seconds()
            remaining = max(0, self._auto_off_duration - elapsed)
            return int(remaining)
        return None