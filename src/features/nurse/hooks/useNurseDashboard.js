import { useAsyncData } from "@/hooks/useAsyncData";
import { nurseService } from "@/features/nurse/api";

export function useNurseDashboard() {
  return useAsyncData(() => nurseService.getDashboard(), "shift");
}
