#!/usr/bin/env python3
"""
Test script for LED visualization mode
"""

import asyncio
import logging
from services.led_controller import LEDController, LEDConfig, LEDMode
from services.led_visualizations import VisualizationType

logging.basicConfig(level=logging.INFO)

async def test_visualization():
    """Test the type distribution visualization"""
    
    # Create controller in mock mode
    config = LEDConfig(mock_mode=True)
    controller = LEDController(config)
    
    # Create sample entries
    sample_entries = [
        {'type': 'Earthy', 'title': 'Sahara Desert', 'creationDate': '2023-01-01'},
        {'type': 'Earthy', 'title': 'Gobi Desert', 'creationDate': '2023-01-02'},
        {'type': 'Oceanic', 'title': 'Maldives Beach', 'creationDate': '2023-01-03'},
        {'type': 'Oceanic', 'title': 'Caribbean Shore', 'creationDate': '2023-01-04'},
        {'type': 'Volcanic', 'title': 'Mount Etna', 'creationDate': '2023-01-05'},
        {'type': 'Glacial', 'title': 'Antarctic Ice', 'creationDate': '2023-01-06'},
        {'type': 'Biological', 'title': 'Coral Sand', 'creationDate': '2023-01-07'},
        {'type': 'Unusual', 'title': 'Moon Dust Simulant', 'creationDate': '2023-01-08'},
    ]
    
    print("Testing LED Visualization Mode")
    print("==============================")
    
    # Set visualization mode
    await controller.set_mode(LEDMode.VISUALIZATION)
    print(f"Mode set to: {controller._mode.value}")
    
    # Get visualization engine and update entries
    viz_engine = controller.get_visualization_engine()
    viz_engine.update_entries(sample_entries)
    print(f"Loaded {len(sample_entries)} sample entries")
    
    # Start visualization
    print("\nStarting type distribution visualization...")
    print("Watch console for 15 seconds to see the cycle")
    print("Press Ctrl+C to stop\n")
    
    await viz_engine.start_visualization(VisualizationType.TYPE_DISTRIBUTION)
    
    try:
        # Let it run for a while
        await asyncio.sleep(20)
    except KeyboardInterrupt:
        print("\nStopping visualization...")
    
    # Stop visualization
    await viz_engine.stop_visualization()
    await controller.set_mode(LEDMode.INTERACTIVE)
    
    print("\nVisualization test complete!")

if __name__ == '__main__':
    asyncio.run(test_visualization())