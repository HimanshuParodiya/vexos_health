import { pickService } from "@/services/pick-service";
import { nurseApi } from "./nurse.api";
import { nurseMock } from "./nurse.mock";

export const nurseService = pickService(nurseApi, nurseMock);
