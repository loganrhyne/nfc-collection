# STRATA frontend

The light archive interface uses limestone surfaces, ink typography, and oxide accents to relate the touchscreen to the STRATA enclosure. The main layout targets landscape touchscreens and laptop browsers, including 1280 × 800 and 1024 × 600. A phone layout is deliberately outside this change.

## Interaction contract

- Landscape, region, quarter, search, and geographic filters intersect. Tap an active category again or remove its chip to clear it. Clear all retains the loaded archive.
- Region and quarter bars retain type-colored distributions. Large category/quarter buttons select the dimension; combine with the landscape filter for the same joint selections without tapping tiny chart segments. The chronology explicitly lists quarters containing specimens and scrolls horizontally.
- Map: normal one-finger/mouse dragging pans; pinch, wheel, keyboard arrows and +/− controls navigate. Select area supports two corner taps or a pointer drag. Escape/Cancel restores normal panning. Filter this view is the keyboard-friendly geographic selection path. Markers offer both field-note navigation and close-up location zoom. Atlas, Satellite and Terrain layers retain their source attribution.
- Specimen cards open field notes. Inline media, fullscreen media navigation, registration, grid placement feedback, LED brightness/modes/visualizations, and build details remain available.
- NFC routes resolve against the complete archive even when an active filter excludes the scanned specimen. Invalid links have an explicit not-found state.
- Registration feedback remains open until Done so grid coordinates can be read. Pending registration is cancelled when its dialog closes. Offline writes are never queued for later replay.

## Implementation

`App.js` owns the shell and routes. `components/layout/Archive.js` owns the explorer, facets, chronology and specimen index. `App.css` contains the shared palette, typography, spacing and layout rules. The existing journal/media rendering pipeline remains in use.

`DataContext` derives filtered entries with a pure memo and exposes load/error/retry state. One `WebSocketProvider` owns the transport; subscribers receive events individually, and LED status does not depend on a single last-message slot. LED indexing is memoized, reconnect re-sends current state, and an empty filter result stays empty when interactive mode is enabled.

Production keeps `/data/` and the existing Socket.IO event protocol. The default production socket URL is the page origin (nginx already proxies `/socket.io/`); `REACT_APP_WS_URL` remains an override. No Python service or device configuration changes are required.

## Local preview with real media

Normal setup: `cd dashboard-ui`, `npm ci`, `npm start`.

To inspect an existing Day One export without copying private media into a build, put these settings in the ignored `.env.development.local`:

```dotenv
STRATA_ARCHIVE_DIR="/absolute/path/to/Day One export"
STRATA_JOURNAL_FILE="Sand Collection.json"
REACT_APP_WS_URL=http://localhost:8019
PORT=3019
HOST=127.0.0.1
BROWSER=none
```

`src/setupProxy.js` serves only the selected journal and photos/videos/PDFs during development. The example unused socket port keeps preview interactions disconnected from hardware. Do not place full exports inside `public/`: CRA copies that directory into production builds. Restart the dev server after changing these settings.

## Verification

```sh
CI=true npm test -- --watchAll=false --runInBand
npm run build
```

Tests cover cross-filtering, archive retry, direct and NFC navigation outside filters, registration lifecycle/StrictMode, shared socket subscriptions, offline-write suppression, LED reconnect and empty-result behavior, brightness/visualization commands, zero coordinates, two-corner selection, pointer dragging/cancellation and viewport filtering.

Browser checks cover real archive photographs, search, field notes, keyboard filters, map selection and layers, and the compact landscape layout. Physical multi-touch, NFC tag writes and LED appearance still require testing on the Pi before deployment. The existing media pipeline remains subject to the browser's video-codec support; no transcoding changes are included. Existing warnings in legacy debug/media utilities and the CRA toolchain are separate from the rewritten components.
