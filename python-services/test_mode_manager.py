#!/usr/bin/env python3
"""
Test script for LED Mode Manager
"""

import asyncio
import logging
from services.led_controller import LEDController, LEDConfig, LEDMode
from services.led_mode_manager import LEDModeManager

logging.basicConfig(level=logging.INFO)

async def test_mode_manager():
    """Test the LED mode manager"""
    
    # Create controller in mock mode
    config = LEDConfig(mock_mode=True)
    controller = LEDController(config)
    manager = LEDModeManager(controller)
    
    # Sample entries
    sample_entries = [
        {'type': 'Beach', 'title': 'Sahara Desert', 'creationDate': '2023-01-01'},
        {'type': 'River', 'title': 'Nile River', 'creationDate': '2023-01-02'},
        {'type': 'Mountain', 'title': 'Alps', 'creationDate': '2023-01-03'},
    ]
    
    print("Testing LED Mode Manager")
    print("=" * 50)
    
    # Test 1: Start in interactive mode
    status = manager.get_status()
    print(f"\nInitial status: {status}")
    assert status['current_mode'] == 'interactive'
    
    # Test 2: Switch to visualization mode
    print("\n2. Switching to visualization mode...")
    await manager.update_entries(sample_entries)
    status = await manager.set_mode(LEDMode.VISUALIZATION)
    print(f"Status after switch: {status}")
    assert status['current_mode'] == 'visualization'
    
    # Let it run for a bit
    await asyncio.sleep(3)
    
    # Test 3: Switch back to interactive
    print("\n3. Switching back to interactive mode...")
    status = await manager.set_mode(LEDMode.INTERACTIVE)
    print(f"Status after switch: {status}")
    assert status['current_mode'] == 'interactive'
    
    # Test 4: Interactive update
    print("\n4. Testing interactive update...")
    interactive_entries = [
        {'index': 0, 'color': '#FFC800', 'type': 'Beach', 'isSelected': True},
        {'index': 1, 'color': '#2846FF', 'type': 'River', 'isSelected': False},
    ]
    await manager.handle_interactive_update(interactive_entries)
    
    print("\n✓ All tests passed!")

if __name__ == '__main__':
    asyncio.run(test_mode_manager())