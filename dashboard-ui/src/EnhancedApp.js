import React, { useState, useEffect } from 'react';
import { createGlobalStyle } from 'styled-components';
import { AnimatePresence } from 'framer-motion';
import { EnhancedDashboard } from './components/dashboard/EnhancedDashboard';
import { EnhancedEntryForm } from './components/entry/EnhancedEntryForm';
import { colors, typography } from './styles/designSystem';

const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html {
    font-size: 16px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    scroll-behavior: smooth;
  }

  body {
    font-family: ${typography.fontFamily.sans};
    font-size: ${typography.fontSize.base};
    line-height: ${typography.lineHeight.normal};
    color: ${colors.stone[900]};
    background: ${colors.sand[50]};
    overflow-x: hidden;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: ${typography.fontFamily.serif};
    line-height: ${typography.lineHeight.tight};
  }

  a {
    color: ${colors.primary};
    text-decoration: none;
    transition: color 0.2s ease;

    &:hover {
      color: ${colors.primaryDark};
    }
  }

  button {
    font-family: inherit;
    cursor: pointer;
  }

  input, textarea {
    font-family: inherit;
  }

  ::selection {
    background-color: ${colors.primaryAlpha};
    color: ${colors.stone[900]};
  }

  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 12px;
    height: 12px;
  }

  ::-webkit-scrollbar-track {
    background: ${colors.stone[100]};
  }

  ::-webkit-scrollbar-thumb {
    background: ${colors.stone[300]};
    border-radius: 6px;
    border: 2px solid ${colors.stone[100]};
    
    &:hover {
      background: ${colors.stone[400]};
    }
  }

  /* Prevent touch delay on mobile */
  * {
    touch-action: manipulation;
  }

  /* Prevent text selection on UI elements */
  button, nav, header {
    user-select: none;
    -webkit-user-select: none;
  }

  /* Smooth transitions for theme changes */
  * {
    transition: background-color 0.3s ease, border-color 0.3s ease;
  }
`;

// Mock data for demonstration
const mockEntries = [
  {
    id: 1,
    title: "Bondi Beach Morning",
    content: "Collected this beautiful white sand during an early morning walk. The texture is incredibly fine, almost like powder. The beach was quiet, just the sound of waves and seagulls.",
    location: {
      name: "Bondi Beach",
      address: "Bondi Beach, Sydney NSW 2026, Australia",
      coordinates: { lat: -33.890542, lng: 151.274856 }
    },
    created_at: new Date('2024-01-15T08:30:00'),
    media: [
      { id: 1, url: '/api/placeholder/400/300', type: 'image' },
      { id: 2, url: '/api/placeholder/400/300', type: 'image' }
    ]
  },
  {
    id: 2,
    title: "Byron Bay Sunset",
    content: "Golden hour at Byron Bay. The sand here has a unique golden tint that becomes even more pronounced during sunset. Mixed with tiny shell fragments that sparkle in the light.",
    location: {
      name: "Byron Bay Main Beach",
      address: "Main Beach, Byron Bay NSW 2481, Australia",
      coordinates: { lat: -28.643657, lng: 153.612915 }
    },
    created_at: new Date('2024-01-20T18:45:00'),
    media: [
      { id: 3, url: '/api/placeholder/400/300', type: 'image' }
    ]
  },
  {
    id: 3,
    title: "Whitehaven Wonder",
    content: "The purest white silica sand I've ever seen. It's so fine it squeaks when you walk on it. This sample is from Hill Inlet lookout area where the tidal patterns create beautiful swirls.",
    location: {
      name: "Whitehaven Beach",
      address: "Whitsundays QLD 4802, Australia",
      coordinates: { lat: -20.282783, lng: 149.039166 }
    },
    created_at: new Date('2024-02-05T11:00:00'),
    media: [
      { id: 4, url: '/api/placeholder/400/300', type: 'image' },
      { id: 5, url: '/api/placeholder/400/300', type: 'image' },
      { id: 6, url: '/api/placeholder/400/300', type: 'image' }
    ]
  },
  {
    id: 4,
    title: "Cable Beach Pearls",
    content: "Red ochre sand from Cable Beach in Broome. The contrast between the red cliffs and turquoise water is stunning. Found some tiny shells mixed in with the sand.",
    location: {
      name: "Cable Beach",
      address: "Cable Beach, Broome WA 6725, Australia",
      coordinates: { lat: -17.958089, lng: 122.209394 }
    },
    created_at: new Date('2024-02-28T16:30:00'),
    media: []
  },
  {
    id: 5,
    title: "Lucky Bay Crystal",
    content: "The sand at Lucky Bay is like crystal - pure white and incredibly fine. Kangaroos were lounging on the beach when I collected this sample. A truly Australian experience!",
    location: {
      name: "Lucky Bay",
      address: "Cape Le Grand National Park WA 6450, Australia",
      coordinates: { lat: -33.989444, lng: 122.230556 }
    },
    created_at: new Date('2024-03-10T14:15:00'),
    media: [
      { id: 7, url: '/api/placeholder/400/300', type: 'image' }
    ]
  }
];

function EnhancedApp() {
  const [entries, setEntries] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading data
    setTimeout(() => {
      setEntries(mockEntries);
      setIsLoading(false);
    }, 1000);
  }, []);

  const handleAddEntry = () => {
    setShowAddForm(true);
  };

  const handleSubmitEntry = (newEntry) => {
    const entry = {
      ...newEntry,
      id: Date.now(),
      created_at: new Date()
    };
    setEntries(prev => [entry, ...prev]);
  };

  const handleEntryClick = (entry) => {
    console.log('Entry clicked:', entry);
    // The EnhancedDashboard component handles showing the entry view internally
  };

  if (isLoading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(180deg, ${colors.sand[50]} 0%, ${colors.ocean[50]} 100%)`
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 60,
            height: 60,
            border: `3px solid ${colors.primary}`,
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
          <p style={{ color: colors.stone[600] }}>Loading your collection...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <GlobalStyle />
      <EnhancedDashboard
        entries={entries}
        onEntryClick={handleEntryClick}
        onAddEntry={handleAddEntry}
      />
      <AnimatePresence>
        {showAddForm && (
          <EnhancedEntryForm
            onClose={() => setShowAddForm(false)}
            onSubmit={handleSubmitEntry}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default EnhancedApp;