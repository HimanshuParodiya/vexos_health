import { useAsyncData } from "@/hooks/useAsyncData";
import { doctorService } from "@/features/doctor/api";

export function useDoctorDashboard(days) {
  return useAsyncData(() => doctorService.getDashboard({ days }), days);
}
