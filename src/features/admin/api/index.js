import { pickService } from "@/services/pick-service";
import { adminApi } from "./admin.api";
import { adminMock } from "./admin.mock";

export const adminService = pickService(adminApi, adminMock);
