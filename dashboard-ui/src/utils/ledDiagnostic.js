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
  
  // Show grid layout (20x5)
  console.log('\nGrid Layout (20x5):');
  const grid = Array(5).fill(null).map(() => Array(20).fill('·'));
  
  ledData.forEach(led => {
    if (led.index >= 0 && led.index < 100) {
      const row = Math.floor(led.index / 20);
      const col = led.index % 20;
      if (row < 5 && col < 20) {
        grid[row][col] = led.isSelected ? '★' : '●';
      }
    }
  });
  
  // Print grid with serpentine annotation
  grid.forEach((row, idx) => {
    const rowStr = row.join(' ');
    const direction = idx % 2 === 0 ? '→' : '←';
    console.log(`Row ${idx} ${direction}: ${rowStr}`);
  });
  
  console.log('\nTotal entries:', allEntries.length);
  console.log('Filtered entries:', entries.length);
  console.log('LED positions:', ledData.length);
  console.log('=========================');
};