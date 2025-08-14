# Data File Locations

## Journal and Media Data

The React app loads all data files from the web server's root `/data/` path, which maps to:

- **Development mode** (`npm start`): `dashboard-ui/public/data/`
- **Production build**: `dashboard-ui/build/data/`

### Important Files:
- `/data/journal.json` - Main journal entries (currently 5495 lines)
- `/data/entry_schema.json` - Schema definition for journal entries
- `/data/photos/` - Photo media files
- `/data/videos/` - Video media files
- `/data/pdfs/` - PDF document files

### Data Loading
The data is loaded in `src/context/DataContext.js` at line 67:
```javascript
const response = await fetch('/data/journal.json');
```

### Updating Data
To update journal entries:
1. Edit `dashboard-ui/public/data/journal.json`
2. The changes will be reflected immediately in development
3. For production, rebuild the app to copy updated data to the build directory

### Note on Removed Files
Previously there were duplicate data files in `src/data/` that were not being used and have been removed to avoid confusion.

### Build Process
When you run `npm run build`, the build process automatically copies everything from `public/` to `build/`, including the `data/` directory.