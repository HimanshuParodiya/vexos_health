import { createContext, useContext } from "react";

export const UnitDataContext = createContext(null);

export function useUnitData() {
  const context = useContext(UnitDataContext);
  if (!context) throw new Error("useUnitData must be used inside <UnitDataProvider>");
  return context;
}

// Null outside the clinical shell (e.g. the admin layout).
export function useOptionalUnitData() {
  return useContext(UnitDataContext);
}
