import { createContext, useContext } from "react";

export const TelemetryContext = createContext(null);

// Returns null outside <TelemetryProvider> (e.g. the admin shell).
export function useTelemetry() {
  return useContext(TelemetryContext);
}
