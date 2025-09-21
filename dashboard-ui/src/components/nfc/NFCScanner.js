import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../../hooks/useWebSocket';

const NFCScanner = () => {
  const navigate = useNavigate();
  const { registerHandler, connected, lastMessage } = useWebSocket();

  useEffect(() => {
    console.log('🔍 NFCScanner mounted, WebSocket connected:', connected);
    console.log('📡 Registering handler for tag_scanned events');

    const cleanup = registerHandler('tag_scanned', (message) => {
      console.log('🏷️ Tag scanned event received:', message);
      console.log('📦 Message structure:', {
        hasData: !!message.data,
        dataKeys: message.data ? Object.keys(message.data) : [],
        rawMessage: JSON.stringify(message)
      });

      // Extract entry_id from the nested data structure
      const entryId = message.data?.entry_id;
      if (entryId) {
        // Navigate to the entry view
        console.log(`✅ Navigating to entry: ${entryId}`);
        navigate(`/entry/${entryId}`);
      } else {
        console.error('❌ No entry_id found in tag_scanned message');
        console.error('Message data:', message.data);
        console.error('Full message:', message);
      }
    });

    console.log('✅ NFCScanner handler registered successfully');

    return () => {
      console.log('🔚 NFCScanner unmounting, cleaning up handler');
      cleanup();
    };
  }, [registerHandler, navigate, connected]);

  // Also log any WebSocket messages for debugging
  useEffect(() => {
    if (lastMessage) {
      console.log(`📨 WebSocket message (type: ${lastMessage.type}):`, lastMessage);
    }
  }, [lastMessage]);
  
  // This component doesn't render anything
  return null;
};

export default NFCScanner;