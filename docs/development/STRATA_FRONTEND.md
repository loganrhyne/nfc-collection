# STRATA frontend

The light archive interface uses limestone surfaces, ink typography, and oxide accents to relate the touchscreen to the STRATA enclosure. The main layout targets landscape touchscreens and laptop browsers, including 1280 × 800 and 1024 × 600. A phone layout is deliberately outside this change. The map and specimen list use the full available height above the device controls; decorative page headers and the specimen-list caption are omitted.

## Interaction contract

- Landscape, region, quarter, search, and geographic filters intersect. Tap an active category again or remove its chip to clear it. Clear all retains the loaded archive.
- Region and quarter bars retain type-colored distributions. Large category/quarter buttons select the dimension; combine with the landscape filter for the same joint selections without tapping tiny chart segments. The chronology includes every quarter from the first to the last specimen, leaving blank bars for quarters without matches. Its date range stays fixed while filtering, and all quarters fit the available width without scrolling. Shared year labels open a quarter picker with large touch targets. Bars support direct selection and Left/Right/Home/End keyboard navigation, with one tab stop for the plot.
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

Browser checks cover real archive photographs, search, field notes, keyboard filters, map selection and layers, and the compact landscape layout. Physical multi-touch, NFC tag writes and LED appearance still require a hands-on acceptance check. The existing media pipeline remains subject to the browser's video-codec support; no transcoding changes are included. Existing warnings in legacy debug/media utilities and the CRA toolchain are separate from the rewritten components.

## Pi frontend deployment — 2026-09-21

The frontend is served at `http://192.168.1.114/` from `/home/loganrhyne/nfc-collection/dashboard-ui/build`. Deployment preserves the Pi's local backend changes and `/home/loganrhyne/nfc-media` archive. The production socket connects through nginx on port 80. Build details include the frontend source commit; the backend checkout can have a different revision.

The previous frontend is backed up at `/home/loganrhyne/nfc-collection/dashboard-ui/build-pre-strata-c68fb84`. Assets are copied before atomically replacing `index.html`; old hashed assets are retained for already-open clients. To restore the previous UI, copy that backup's `index.html` to `build/index.html.rollback`, then rename it to `build/index.html`. No backend or nginx restart is needed.

Live checks confirmed 168 journal entries, successful search and field-note navigation, the display socket connection, and healthy NFC/LED services. Map tile bounds explicitly constrain requests to the Web Mercator world; `noWrap` alone still allowed invalid tile columns at the overview zoom.
