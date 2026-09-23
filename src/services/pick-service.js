import { env } from "@/config/env";

// Returns the mock implementation while VITE_USE_MOCK_API is true, else the real one.
// Both must expose the same functions and response shapes.
export function pickService(realService, mockService) {
  return env.useMockApi ? mockService : realService;
}
