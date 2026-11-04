import DottedMap from "dotted-map/without-countries";
// Grid precomputed with getMapJSON({ height: 124, grid: "vertical", countries: ["IND"] })
// over a wider region, plus the northern outline (J&K, Ladakh) the library omits.
import indiaGrid from "@/data/india-dotted-map.json";

export type IndiaMap = {
  width: number;
  height: number;
  /** Land dots, [x, y]. */
  dots: [number, number][];
  /** One pin per id, snapped to the nearest dot. */
  pins: Record<string, [number, number]>;
};

/** India's dot grid with a pin for each place. Runs on the server. */
export function indiaMap(
  places: { id: string; lat: number; lng: number }[],
): IndiaMap {
  const map = new DottedMap({
    map: indiaGrid as ConstructorParameters<typeof DottedMap>[0]["map"],
  });
  const pins: Record<string, [number, number]> = {};
  for (const place of places) {
    const pin = map.addPin({
      lat: place.lat,
      lng: place.lng,
      data: { id: place.id },
    });
    pins[place.id] = [pin.x, pin.y];
  }
  const dots = map
    .getPoints()
    .filter((point) => !point.data)
    .map((point) => [point.x, point.y] as [number, number]);
  return { width: indiaGrid.width, height: indiaGrid.height, dots, pins };
}
