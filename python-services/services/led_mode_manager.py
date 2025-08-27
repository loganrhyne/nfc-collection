#!/usr/bin/env python3
"""
LED Mode Manager - Centralized state management for LED modes
"""

import asyncio
import logging
from typing import Optional, List, Dict
from enum import Enum
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
        self._current_mode = LEDMode.INTERACTIVE
        self._visualization_task = None
        self._entries_data = []
        
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
        
        # Set new mode
        self._current_mode = mode
        await self.led_controller.set_mode(mode)
        
        # Initialize new mode
        if mode == LEDMode.VISUALIZATION and auto_start_viz:
            await self._start_visualization()
        # Don't clear on interactive mode - let the client send its data
        
        return self.get_status()
    
    async def update_entries(self, entries: List[Dict]):
        """Update entries data for visualizations"""
        self._entries_data = entries
        
        # If in visualization mode, update the engine
        if self._current_mode == LEDMode.VISUALIZATION:
            viz_engine = self.led_controller.get_visualization_engine()
            viz_engine.update_entries(entries)
    
    async def _start_visualization(self):
        """Start visualization cycle"""
        if self._visualization_task:
            await self._stop_visualization()
        
        # Update entries in visualization engine
        viz_engine = self.led_controller.get_visualization_engine()
        viz_engine.update_entries(self._entries_data)
        
        # Start with type distribution (only one implemented so far)
        await viz_engine.start_visualization(VisualizationType.TYPE_DISTRIBUTION)
        logger.info("Started visualization cycle")
    
    async def _stop_visualization(self):
        """Stop visualization and clean up"""
        viz_engine = self.led_controller.get_visualization_engine()
        await viz_engine.stop_visualization()
        logger.info("Stopped visualization")
    
    def get_status(self) -> Dict:
        """Get current status for frontend sync"""
        base_status = self.led_controller.get_status()
        
        return {
            **base_status,
            'current_mode': self._current_mode.value,
            'has_entries': len(self._entries_data) > 0,
        }
    
    async def handle_interactive_update(self, entries: List[Dict]):
        """Handle LED update for interactive mode"""
        if self._current_mode != LEDMode.INTERACTIVE:
            logger.warning("Received interactive update while not in interactive mode")
            return
        
        await self.led_controller.update_interactive_mode(entries)
    
    async def clear_all(self):
        """Clear all LEDs"""
        await self.led_controller.clear_all()