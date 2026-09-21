import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MapInteraction, PopupLayer } from "./MapView";
const mockControl = () => ({
  enabled: () => true,
  disable: jest.fn(),
  enable: jest.fn(),
});
const mockMap = {
  fitBounds: jest.fn(),
  setView: jest.fn(),
  getContainer: () => document.body,
  invalidateSize: jest.fn(),
  containerPointToLatLng: ([x, y]) => ({ lat: y, lng: x }),
  dragging: mockControl(),
  touchZoom: mockControl(),
  doubleClickZoom: mockControl(),
  boxZoom: mockControl(),
  scrollWheelZoom: mockControl(),
  getBounds: () => ({
    getSouth: () => 1,
    getNorth: () => 9,
    getWest: () => 2,
    getEast: () => 10,
  }),
};
jest.mock(
  "react-leaflet",
  () => ({ useMap: () => mockMap, Rectangle: () => null }),
  { virtual: true },
);
const points = [[0, 0]];
beforeAll(() => {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  window.PointerEvent = class extends MouseEvent {
    constructor(type, props) {
      super(type, props);
      Object.defineProperty(this, "pointerId", { value: props.pointerId || 1 });
      Object.defineProperty(this, "isPrimary", {
        value: props.isPrimary !== false,
      });
    }
  };
  HTMLElement.prototype.setPointerCapture = jest.fn();
  HTMLElement.prototype.hasPointerCapture = () => true;
  HTMLElement.prototype.releasePointerCapture = jest.fn();
});
test("popup layer stays above controls and clamps each viewport edge without panning", () => {
  const container = document.createElement("div");
  const movingPane = document.createElement("div");
  const popupPane = document.createElement("div");
  const popupElement = document.createElement("div");
  container.appendChild(movingPane);
  movingPane.appendChild(popupPane);
  popupPane.appendChild(popupElement);
  document.body.appendChild(container);
  container.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    right: 400,
    bottom: 220,
  });
  let bounds = { left: -30, top: -10, right: 210, bottom: 110 };
  popupElement.getBoundingClientRect = () => bounds;
  const handlers = {};
  mockMap.getContainer = () => container;
  mockMap.getPane = () => popupPane;
  mockMap.layerPointToContainerPoint = () => ({ x: 0, y: 0 });
  mockMap.on = jest.fn((names, fn) =>
    names.split(" ").forEach((name) => {
      handlers[name] = fn;
    }),
  );
  mockMap.off = jest.fn();
  const popup = {
    getElement: () => popupElement,
    on: jest.fn(),
    off: jest.fn(),
  };
  const view = render(<PopupLayer />);
  expect(popupPane.parentElement).toBe(container);
  expect(popupPane.style.zIndex).toBe("1100");
  handlers.popupopen({ popup });
  expect(popupElement.style.translate).toBe("42px 22px");
  expect(popupElement).toHaveClass("popup-clamped");
  bounds = { left: 210, top: 140, right: 450, bottom: 260 };
  handlers.move();
  expect(popupElement.style.translate).toBe("-62px -52px");
  bounds = { left: 80, top: 30, right: 320, bottom: 150 };
  handlers.zoomend();
  expect(popupElement.style.translate).toBe("0px 0px");
  expect(popupElement).not.toHaveClass("popup-clamped");
  view.unmount();
  expect(popupPane.parentElement).toBe(movingPane);
  expect(popup.off).toHaveBeenCalledWith("contentupdate", expect.any(Function));
  expect(mockMap.off).toHaveBeenCalledWith("popupopen", expect.any(Function));
  container.remove();
  mockMap.getContainer = () => document.body;
});
const tap = (node, x, y) => {
  fireEvent.pointerDown(node, {
    clientX: x,
    clientY: y,
    button: 0,
    pointerId: 1,
  });
  fireEvent.pointerUp(node, {
    clientX: x,
    clientY: y,
    button: 0,
    pointerId: 1,
  });
};
test("two corner taps select bounds and restore panning", () => {
  const select = jest.fn();
  render(<MapInteraction points={points} onSelect={select} />);
  fireEvent.click(screen.getByText("Select area"));
  expect(mockMap.dragging.disable).toHaveBeenCalled();
  const surface = screen.getByTestId("map-selection-surface");
  tap(surface, 20, 30);
  expect(select).not.toHaveBeenCalled();
  tap(surface, 80, 90);
  expect(select).toHaveBeenCalledWith({
    west: 20,
    south: 30,
    east: 80,
    north: 90,
  });
  expect(screen.queryByTestId("map-selection-surface")).not.toBeInTheDocument();
  expect(mockMap.dragging.enable).toHaveBeenCalled();
});
test("mouse drag selects; Escape cancels without filtering", () => {
  const select = jest.fn();
  render(<MapInteraction points={points} onSelect={select} />);
  fireEvent.click(screen.getByText("Select area"));
  const surface = screen.getByTestId("map-selection-surface");
  fireEvent.pointerDown(surface, { clientX: 10, clientY: 20, button: 0 });
  fireEvent.pointerMove(surface, { clientX: 50, clientY: 70 });
  fireEvent.pointerUp(surface, { clientX: 50, clientY: 70 });
  expect(select).toHaveBeenCalledWith({
    west: 10,
    south: 20,
    east: 50,
    north: 70,
  });
  fireEvent.click(screen.getByText("Select area"));
  fireEvent.keyDown(window, { key: "Escape" });
  expect(select).toHaveBeenCalledTimes(1);
});
test("viewport filtering is available without drawing", () => {
  const select = jest.fn();
  render(<MapInteraction points={points} onSelect={select} />);
  fireEvent.click(screen.getByText("Filter this view"));
  expect(select).toHaveBeenCalledWith({
    south: 1,
    north: 9,
    west: 2,
    east: 10,
  });
});

test("a second touch cancels an unfinished drawing without applying a filter", () => {
  const select = jest.fn();
  render(<MapInteraction points={points} onSelect={select} />);
  fireEvent.click(screen.getByText("Select area"));
  const surface = screen.getByTestId("map-selection-surface");
  fireEvent.pointerDown(surface, {
    clientX: 10,
    clientY: 20,
    button: 0,
    pointerId: 1,
  });
  fireEvent.pointerDown(surface, {
    clientX: 50,
    clientY: 60,
    button: 0,
    pointerId: 2,
    isPrimary: false,
  });
  fireEvent.pointerUp(surface, { clientX: 80, clientY: 90, pointerId: 1 });
  expect(select).not.toHaveBeenCalled();
});
