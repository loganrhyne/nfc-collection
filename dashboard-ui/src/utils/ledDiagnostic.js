/**
 * LED Diagnostic Tool
 * Add this temporarily to debug LED index mapping
 */

export const createLEDDiagnosticLog = (allEntries, entries, ledData) => {
  console.log('=== LED INDEX DIAGNOSTIC ===');
  
  // Show how entries are sorted in UI (newest first)
  const uiSorted = [...entries].sort((a, b) => 
    new Date(b.creationDate) - new Date(a.creationDate)
  );
  
  console.log('UI Order (newest first):');
  uiSorted.slice(0, 10).forEach((entry, idx) => {
    console.log(`  ${idx}: ${entry.title} (${new Date(entry.creationDate).toLocaleDateString()})`);
  });
  
  // Show how entries are sorted for LED indexing (oldest first)
  const ledSorted = [...allEntries].sort((a, b) => 
    new Date(a.creationDate) - new Date(b.creationDate)
  );
  
  console.log('\nLED Index Order (oldest first):');
  ledSorted.slice(0, 10).forEach((entry, idx) => {
    console.log(`  ${idx}: ${entry.title} (${new Date(entry.creationDate).toLocaleDateString()})`);
  });
  
  // Show the actual LED data being sent
  console.log('\nLED Data being sent:');
  ledData.forEach(led => {
    const entry = entries.find(e => {
      const idx = ledSorted.findIndex(le => le.uuid === e.uuid);
      return idx === led.index;
    });
    console.log(`  Index ${led.index}: ${entry?.title || 'NOT FOUND'} - ${led.color}${led.isSelected ? ' (SELECTED)' : ''}`);
  });
  
  // Show grid layout
  console.log('\nGrid Layout (10x15):');
  const grid = Array(10).fill(null).map(() => Array(15).fill('·'));
  
  ledData.forEach(led => {
    const row = Math.floor(led.index / 15);
    const col = led.index % 15;
    if (row < 10 && col < 15) {
      grid[row][col] = led.isSelected ? '★' : '●';
    }
  });
  
  grid.forEach((row, idx) => {
    console.log(`Row ${idx}: ${row.join(' ')}`);
  });
  
  console.log('\nTotal entries:', allEntries.length);
  console.log('Filtered entries:', entries.length);
  console.log('LED positions:', ledData.length);
  console.log('=========================');
};