import { useAsyncData } from "@/hooks/useAsyncData";
import { adminService } from "@/features/admin/api";

export function useAdminDashboard(days) {
  return useAsyncData(() => adminService.getDashboard({ days }), days);
}
