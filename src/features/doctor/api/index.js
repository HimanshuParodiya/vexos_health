import { pickService } from "@/services/pick-service";
import { doctorApi } from "./doctor.api";
import { doctorMock } from "./doctor.mock";

export const doctorService = pickService(doctorApi, doctorMock);
