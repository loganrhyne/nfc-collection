import { useEffect } from 'react';
import { useLEDController } from '../../hooks/useLEDController';

/**
 * Component that manages LED visualization based on app state
 * No UI - just handles LED updates in the background
 */
const LEDController = () => {
  const { clearAllLEDs } = useLEDController();
  
  // Clear all LEDs when component unmounts
  useEffect(() => {
    console.log('LED Controller initialized');
    
    return () => {
      console.log('LED Controller unmounting - clearing LEDs');
      clearAllLEDs();
    };
  }, [clearAllLEDs]);
  
  // The useLEDController hook handles all the LED updates internally
  // based on selectedEntry changes, so we don't need any additional logic here
  
  return null; // No UI component
};

export default LEDController;