// Shared Recharts props so every chart follows the same visual rules:
// hairline solid gridlines, muted axis text, 2px lines, bars <= 24px with 4px rounded ends.

export const GRID_PROPS = {
  vertical: false,
  stroke: "var(--chart-grid)",
  strokeDasharray: "0",
};

export const AXIS_PROPS = {
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
  fontSize: 12,
};

export const LINE_PROPS = {
  type: "monotone",
  strokeWidth: 2,
  dot: false,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

// Hovered point: 8px dot with a 2px ring in the card colour.
export const ACTIVE_DOT = { r: 4, strokeWidth: 2, stroke: "var(--card)" };

// Keep legend items in series order (Recharts sorts them by name by default).
export const LEGEND_PROPS = { itemSorter: null };

export const BAR_MAX_SIZE = 24;
export const BAR_RADIUS_TOP = [4, 4, 0, 0];
export const BAR_RADIUS_END = [0, 4, 4, 0];

// Stacked segments are separated by a 2px gap in the surface colour.
export const STACK_GAP = { stroke: "var(--card)", strokeWidth: 2 };
