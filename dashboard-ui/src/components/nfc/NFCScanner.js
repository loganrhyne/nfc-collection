import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../../hooks/useWebSocket';

const NFCScanner = () => {
  const navigate = useNavigate();
  const { registerHandler } = useWebSocket();
  
  useEffect(() => {
    const cleanup = registerHandler('tag_scanned', (message) => {
      console.log('Tag scanned:', message);
      
      const entryId = message.entry_id;
      if (entryId) {
        // Navigate to the entry view
        navigate(`/entry/${entryId}`);
        
        // Optional: Show a notification
        console.log(`Navigating to entry: ${entryId}`);
      }
    });
    
    return cleanup;
  }, [registerHandler, navigate]);
  
  // This component doesn't render anything
  return null;
};

export default NFCScanner;