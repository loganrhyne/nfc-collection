# NFC Sand Collection Art Installation

This project is an art installation that combines a physical collection of sand samples (in a grid of plastic boxes) with a digital interface for exploring the collection. Each sample box contains an NFC tag that links to a journal entry with the story behind the sample.

## Project Components

1. **Physical Installation**: A grid of several hundred 1x2x.75" plastic boxes, each containing a sample of sand
2. **NFC Tags**: NTAG213 180kb tags in each sample box, encoded with a UUID
3. **Interactive Dashboard**: Web interface for exploring the collection and reading journal entries
4. **LED System**: Lights up corresponding samples in the physical grid when entries are viewed

## Hardware Setup

- **Computer**: Raspberry Pi 5 (5v/5a26w power supply)
- **LEDs**: WS2812B Addressable pixel LEDs
- **Display**: Waveshare 10.1" display
- **NFC Reader**: PN532 Elechouse NFC v3
- **NFC Tags**: NTAG213 180kb
- **Power**: Traco Power TOP 100-105

## Dashboard UI

The dashboard interface consists of:

- **Map View**: Interactive map showing all sample locations
- **Type Chart**: Bar chart showing counts by type (Beach, Desert, Lake, Mountain, River)
- **Region Chart**: Bar chart showing counts by region with type breakdown
- **Timeline Chart**: Timeline chart showing entries by quarter
- **Entries List**: Chronological list of journal entries
- **Detail View**: Journal entry content with embedded media

### Interactive Features

- Filter entries by clicking on charts
- View details by selecting entries from the map or timeline
- Scan NFC tags to view associated entries
- Register new NFC tags and map them to grid positions
- Highlight all samples of a specific type on the physical grid

## Data Structure

Journal entries are exported from Day One app in a JSON format with:

- Entry metadata (date, location, weather, etc.)
- Journal content (text, richText)
- Tags (including "Type: X" and "Region: Y")
- Media references (photos, videos, PDFs)

## Directory Structure

```
nfc-collection/
├── dashboard-ui/            # React web interface
│   ├── src/                 # React source code
│   │   ├── components/      # UI components
│   │   ├── context/         # Data context
│   │   ├── data/            # Sample data files
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # External services
│   │   └── utils/           # Utility functions
├── data/                    # Data schema and sample data
│   ├── entry_schema.json    # JSON schema for entries
│   └── journal.json         # Sample journal entries
├── testing-scripts/         # Python scripts for NFC testing
│   ├── pn532-test.py        # Basic test for PN532 NFC module
│   ├── simple-reader.py     # Simple NFC tag reader
│   └── write-entry-nfc.py   # Script for writing UUIDs to NFC tags
└── collection_data/         # External directory for media files
    ├── Journal.json         # Complete journal data
    ├── photos/              # Photo files referenced in journal
    ├── videos/              # Video files referenced in journal
    └── pdfs/                # PDF files referenced in journal
```

## Setup & Running

1. Clone the repository
2. Install dependencies:
   ```
   cd dashboard-ui
   npm install
   ```
3. Start the development server:
   ```
   npm start
   ```
4. For NFC testing scripts:
   ```
   cd testing-scripts
   python3 simple-reader.py
   ```

## Dashboard Features

1. **Three-Column Layout**:
   - Left (250px): Type and Region charts
   - Center (flex): Map and Timeline chart
   - Right (350px): Entry list or detail view

2. **Interactive Filtering**:
   - Click on any chart element to filter data
   - Filters are linked across all visualizations
   - Click the same filter again to clear it

3. **NFC Integration**:
   - Scan NFC tag to view associated entry
   - Register new NFC tags with grid positions
   - When entry is viewed, corresponding sample lights up

4. **Color Scheme**:
   - Beach: Gold (#E6C200)
   - Desert: Red-orange (#E67300)
   - Lake: Turquoise (#00B3B3)
   - Mountain: Brown (#996633)
   - River: Blue (#0099FF)

## Future Enhancements

- LED control system integration with WebSockets
- Media gallery for photos and videos
- Search functionality
- Offline support
- Mobile compatibility