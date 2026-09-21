import { boundsFromPoints, validLocation } from "./mapGeometry";
import { applyFilter } from "../../utils/filterUtils";
test("allows equator and prime meridian, rejects invalid coordinates", () => {
  expect(validLocation({ latitude: 0, longitude: 0 })).toBe(true);
  expect(validLocation({ latitude: 91, longitude: 0 })).toBe(false);
  expect(validLocation({ latitude: NaN, longitude: 12 })).toBe(false);
});
test("normalizes corner order for touch and mouse selections", () => {
  const a = { lat: 50, lng: 10 },
    b = { lat: 40, lng: -5 };
  expect(boundsFromPoints(a, b)).toEqual(boundsFromPoints(b, a));
  expect(
    applyFilter(
      [
        { location: { latitude: 45, longitude: 0 } },
        { location: { latitude: 60, longitude: 0 } },
      ],
      "geo",
      boundsFromPoints(a, b),
    ),
  ).toHaveLength(1);
});
