import { TelemetryProvider } from "@/features/telemetry/TelemetryProvider";
import { UnitDataProvider } from "./UnitDataProvider";

// Live stream + unit data shared by every nurse and doctor screen.
export function ClinicalProviders({ children }) {
  return (
    <TelemetryProvider>
      <UnitDataProvider>{children}</UnitDataProvider>
    </TelemetryProvider>
  );
}
