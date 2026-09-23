import { env } from "@/config/env";
import { authApi } from "./auth.api";
import { authMock } from "./auth.mock";

// The rest of the app imports `authService` only. Flip VITE_USE_MOCK_API
// to switch between the fake and the real backend.
export const authService = env.useMockApi ? authMock : authApi;
