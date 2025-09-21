import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../../hooks/useWebSocket';

const NFCScanner = () => {
  const navigate = useNavigate();
  const { registerHandler, connected } = useWebSocket();
  
  useEffect(() => {
    console.log('NFCScanner mounted, WebSocket connected:', connected);
    
    const cleanup = registerHandler('tag_scanned', (message) => {
      console.log('Tag scanned event received:', message);

      // Extract entry_id from the nested data structure
      const entryId = message.data?.entry_id;
      if (entryId) {
        // Navigate to the entry view
        console.log(`Navigating to entry: ${entryId}`);
        navigate(`/entry/${entryId}`);
      } else {
        console.error('No entry_id in tag_scanned message:', message);
      }
    });
    
    return () => {
      console.log('NFCScanner unmounting');
      cleanup();
    };
  }, [registerHandler, navigate, connected]);
  
  // This component doesn't render anything
  return null;
};

export default NFCScanner;