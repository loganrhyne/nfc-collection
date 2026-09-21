import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Rectangle,
  useMap,
} from "react-leaflet";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import { useData } from "../../context/DataContext";
import colors from "../../utils/colorSchemeEnhanced";
import { validLocation, boundsFromPoints } from "./mapGeometry";

const LAYERS = {
  Atlas: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  Satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri &mdash; Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, GIS User Community",
    maxZoom: 18,
  },
  Terrain: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Style &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
    maxZoom: 17,
  },
};
const pathOptions = { color: "#a45135", weight: 2, fillOpacity: 0.12 };
// Leaflet's moving map pane is a stacking context below its controls.
// Keep popups in a sibling pane, preserving the same coordinate origin.
export function PopupLayer() {
  const map = useMap();
  useEffect(() => {
    const pane = map.getPane("popupPane");
    const parent = pane.parentElement;
    const zIndex = pane.style.zIndex;
    const container = map.getContainer();
    container.appendChild(pane);
    pane.style.zIndex = "1100";
    let activePopup = null;
    const sync = () => {
      L.DomUtil.setPosition(pane, map.layerPointToContainerPoint([0, 0]));
      const element = activePopup?.getElement();
      if (!element) return;
      element.style.translate = "none";
      const bounds = container.getBoundingClientRect();
      const popup = element.getBoundingClientRect();
      // Clamp the overlay rather than auto-panning against the world's maxBounds.
      const dx = Math.max(
        bounds.left + 12 - popup.left,
        Math.min(0, bounds.right - 12 - popup.right),
      );
      const dy = Math.max(
        bounds.top + 12 - popup.top,
        Math.min(0, bounds.bottom - 12 - popup.bottom),
      );
      element.style.translate = `${dx}px ${dy}px`;
      // A shifted card must not point at an unrelated location on the map.
      element.classList.toggle(
        "popup-clamped",
        Math.abs(dx) > 1 || Math.abs(dy) > 1,
      );
    };
    const resize = new ResizeObserver(sync);
    resize.observe(container);
    const close = () => {
      if (!activePopup) return;
      resize.unobserve(activePopup.getElement());
      activePopup.off("contentupdate", sync);
      activePopup = null;
    };
    const open = ({ popup }) => {
      close();
      activePopup = popup;
      popup.on("contentupdate", sync);
      resize.observe(popup.getElement());
      sync();
    };
    sync();
    map.on("move zoom zoomend viewreset resize", sync);
    map.on("popupopen", open);
    map.on("popupclose", close);
    return () => {
      close();
      resize.disconnect();
      map.off("move zoom zoomend viewreset resize", sync);
      map.off("popupopen", open);
      map.off("popupclose", close);
      parent.appendChild(pane);
      pane.style.zIndex = zIndex;
      L.DomUtil.setPosition(pane, L.point(0, 0));
    };
  }, [map]);
  return null;
}
export function MapInteraction({ points, onSelect, geo }) {
  const map = useMap();
  const [selecting, setSelecting] = useState(false);
  const [first, setFirst] = useState(null);
  const [preview, setPreview] = useState(null);
  const pointer = useRef(null);
  const overlay = useRef(null);
  const selectButton = useRef(null);
  const fit = useCallback(() => {
    if (points.length)
      map.fitBounds(points, { padding: [36, 36], maxZoom: 12, animate: false });
    else map.setView([22, 10], 2);
  }, [map, points]);
  useEffect(fit, [fit]);
  useEffect(() => {
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(map.getContainer());
    return () => resize.disconnect();
  }, [map]);
  useEffect(() => {
    if (!selecting) return;
    const handlers = [
      map.dragging,
      map.touchZoom,
      map.doubleClickZoom,
      map.boxZoom,
      map.scrollWheelZoom,
    ];
    const enabled = handlers.filter((handler) => handler.enabled());
    enabled.forEach((handler) => handler.disable());
    return () => enabled.forEach((handler) => handler.enable());
  }, [map, selecting]);
  const cancel = useCallback(() => {
    setSelecting(false);
    setFirst(null);
    setPreview(null);
    pointer.current = null;
  }, []);
  useEffect(() => {
    if (!selecting) return;
    const keyboard = (e) => {
      if (e.key === "Escape") {
        cancel();
        selectButton.current?.focus();
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [selecting, cancel]);
  const point = (e) =>
    map.containerPointToLatLng([
      e.clientX - map.getContainer().getBoundingClientRect().left,
      e.clientY - map.getContainer().getBoundingClientRect().top,
    ]);
  const finish = (a, b) => {
    const bounds = boundsFromPoints(a, b);
    if (!bounds || bounds.north === bounds.south || bounds.west === bounds.east)
      return;
    onSelect(bounds);
    cancel();
    selectButton.current?.focus();
  };
  const down = (e) => {
    e.stopPropagation();
    if (e.button !== 0 || e.isPrimary === false) {
      pointer.current = null;
      setFirst(null);
      setPreview(null);
      return;
    }
    e.preventDefault();
    pointer.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      point: point(e),
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    e.stopPropagation();
    const p = pointer.current;
    if (
      p &&
      p.id === e.pointerId &&
      Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8
    )
      setPreview([first || p.point, point(e)]);
  };
  const up = (e) => {
    e.stopPropagation();
    const p = pointer.current;
    pointer.current = null;
    if (!p || p.id !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    const end = point(e);
    if (first || Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8)
      finish(first || p.point, end);
    else {
      setFirst(end);
      setPreview([end, end]);
    }
  };
  return (
    <>
      {geo && (
        <Rectangle
          bounds={[
            [geo.south, geo.west],
            [geo.north, geo.east],
          ]}
          pathOptions={pathOptions}
        />
      )}
      {preview && <Rectangle bounds={preview} pathOptions={pathOptions} />}
      {selecting && (
        <div
          ref={overlay}
          className="map-selection-surface"
          data-testid="map-selection-surface"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={() => {
            pointer.current = null;
            setFirst(null);
            setPreview(null);
          }}
          onLostPointerCapture={() => {
            pointer.current = null;
          }}
        />
      )}
      <div className="map-toolbar" aria-label="Map tools">
        <button
          ref={selectButton}
          aria-pressed={selecting}
          onClick={() => (selecting ? cancel() : setSelecting(true))}
        >
          {selecting ? "Cancel selection ×" : "Select area"}
        </button>
        <button
          onClick={() => {
            const b = map.getBounds();
            onSelect({
              south: b.getSouth(),
              west: b.getWest(),
              north: b.getNorth(),
              east: b.getEast(),
            });
            cancel();
          }}
        >
          Filter this view
        </button>
        <button
          onClick={fit}
          aria-label="Fit matching specimens on map"
          title="Fit matching specimens"
        >
          ↗↙
        </button>
      </div>
      {selecting && (
        <div className="map-instruction" role="status">
          {first
            ? "Now tap the opposite corner."
            : "Tap two opposite corners, or drag an area."}
          <small>Escape or Cancel to return to panning.</small>
        </div>
      )}
    </>
  );
}
function ZoomHere({ location }) {
  const map = useMap();
  return (
    <button
      aria-label="Zoom to location"
      onClick={() => {
        map.closePopup();
        map.setView(
          [location.latitude, location.longitude],
          Math.min(18, map.getMaxZoom()),
        );
      }}
    >
      Zoom here
    </button>
  );
}

export default function MapView() {
  const { entries, filters, setFilter, setSelectedEntry } = useData();
  const navigate = useNavigate();
  const [layer, setLayer] = useState("Atlas");
  const [tileError, setTileError] = useState(false);
  const located = useMemo(
    () => entries.filter((e) => validLocation(e.location)),
    [entries],
  );
  const points = useMemo(
    () => located.map((e) => [e.location.latitude, e.location.longitude]),
    [located],
  );
  const select = useCallback((bounds) => setFilter("geo", bounds), [setFilter]);
  return (
    <div className={`strata-map map-${layer.toLowerCase()}`}>
      <MapContainer
        center={[22, 10]}
        zoom={2}
        minZoom={1}
        zoomSnap={0.25}
        zoomDelta={0.5}
        maxBounds={[
          [-85, -180],
          [85, 180],
        ]}
        maxBoundsViscosity={1}
        zoomControl={true}
        keyboard={true}
        attributionControl={true}
      >
        <TileLayer
          key={layer}
          {...LAYERS[layer]}
          noWrap={true}
          bounds={[
            [-85.05112878, -180],
            [85.05112878, 180],
          ]}
          eventHandlers={{
            tileerror: () => setTileError(true),
            tileload: () => setTileError(false),
          }}
        />
        <MapInteraction points={points} onSelect={select} geo={filters.geo} />
        <PopupLayer />
        {located.map((entry) => (
          <Marker
            key={entry.uuid}
            position={[entry.location.latitude, entry.location.longitude]}
            title={entry.title}
            alt={entry.title}
            icon={L.divIcon({
              className: "specimen-marker",
              html: `<span style="--marker-color:${colors[entry.type] || "#82715d"}"></span>`,
              iconSize: [36, 36],
              iconAnchor: [18, 18],
            })}
          >
            <Popup minWidth={200} maxWidth={240} autoPan={false}>
              <div className="specimen-popup">
                <span className="eyebrow">
                  {entry.type} / {entry.region}
                </span>
                <h3>{entry.title}</h3>
                <p>
                  {entry.location.country} ·{" "}
                  {new Date(entry.creationDate).getFullYear()}
                </p>
                <div className="specimen-popup-actions">
                  <button
                    onClick={() => {
                      setSelectedEntry(entry);
                      navigate(`/entry/${entry.uuid}`);
                    }}
                  >
                    Open note ↗
                  </button>
                  <ZoomHere location={entry.location} />
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <label className="map-layer">
        <span className="sr-only">Map style</span>
        <select
          value={layer}
          onChange={(e) => {
            setLayer(e.target.value);
            setTileError(false);
          }}
        >
          {Object.keys(LAYERS).map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
      <div className="map-caption">
        {located.length
          ? "PAN TO EXPLORE · PINCH OR + / − TO ZOOM"
          : "NO LOCATED SPECIMENS IN THIS SELECTION"}
      </div>
      {tileError && (
        <div className="map-network" role="status">
          Some map tiles are unavailable. Try another map style.
        </div>
      )}
    </div>
  );
}
