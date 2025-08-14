// Debug utility to trace data loading
export const debugDataLoading = {
  // Add timestamp and source info to console logs
  log: (message, data = null) => {
    const timestamp = new Date().toISOString();
    const stack = new Error().stack.split('\n')[2]; // Get caller info
    
    console.log(`[DEBUG ${timestamp}] ${message}`);
    if (data) {
      console.log('Data:', data);
    }
    console.log('Called from:', stack.trim());
  },
  
  // Check what URL is actually being fetched
  interceptFetch: () => {
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const url = args[0];
      if (url.includes('journal.json')) {
        debugDataLoading.log(`Fetching journal.json from: ${url}`);
        
        try {
          const response = await originalFetch.apply(this, args);
          const clonedResponse = response.clone();
          const data = await clonedResponse.json();
          
          debugDataLoading.log(`Loaded journal.json:`, {
            url: url,
            entriesCount: data.entries ? data.entries.length : 'No entries array',
            firstEntry: data.entries ? data.entries[0] : 'No entries',
            lastEntry: data.entries ? data.entries[data.entries.length - 1] : 'No entries',
            responseHeaders: {
              'cache-control': response.headers.get('cache-control'),
              'last-modified': response.headers.get('last-modified'),
              'etag': response.headers.get('etag')
            }
          });
          
          return response;
        } catch (error) {
          debugDataLoading.log(`Error fetching journal.json: ${error.message}`);
          throw error;
        }
      }
      return originalFetch.apply(this, args);
    };
  },
  
  // Add cache busting to journal.json requests
  addCacheBusting: () => {
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      let url = args[0];
      const options = args[1] || {};
      
      if (url.includes('journal.json')) {
        // Add timestamp to bypass cache
        const timestamp = Date.now();
        url = `${url}?t=${timestamp}`;
        
        // Add no-cache headers
        options.cache = 'no-store';
        options.headers = {
          ...options.headers,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        };
        
        debugDataLoading.log(`Cache-busted URL: ${url}`);
        args[0] = url;
        args[1] = options;
      }
      
      return originalFetch.apply(this, args);
    };
  }
};

// Auto-initialize in development
if (process.env.NODE_ENV === 'development' || window.location.search.includes('debug=true')) {
  debugDataLoading.interceptFetch();
  debugDataLoading.log('Debug data loading initialized');
}