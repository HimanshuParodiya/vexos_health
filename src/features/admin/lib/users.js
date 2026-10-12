// Backend role values (CreateUserRequest.role) and how the UI names them.
export const USER_ROLES = [
  { value: "nurse", label: "Nurse" },
  { value: "physician", label: "Doctor" },
  { value: "admin", label: "Administrator" },
];

export function roleLabel(role) {
  return USER_ROLES.find((item) => item.value === role)?.label ?? role;
}

// Most recent successful sign-in per username, from the login-attempts audit trail.
export function lastSignInByUser(attempts = []) {
  const result = {};
  for (const attempt of attempts) {
    if (!attempt.success) continue;
    const time = new Date(attempt.attempted_at).getTime();
    if (!result[attempt.username] || result[attempt.username] < time) result[attempt.username] = time;
  }
  return result;
}

// Usernames with `threshold`+ failed attempts inside the last `windowMinutes`.
export function recentFailures(attempts = [], now = Date.now(), windowMinutes = 10, threshold = 3) {
  const since = now - windowMinutes * 60_000;
  const counts = {};
  for (const attempt of attempts) {
    if (attempt.success || new Date(attempt.attempted_at).getTime() < since) continue;
    counts[attempt.username] = (counts[attempt.username] ?? 0) + 1;
  }
  return Object.entries(counts)
    .filter(([, count]) => count >= threshold)
    .map(([username, count]) => ({ username, count }));
}

// Readable temporary password, e.g. "Kx7-pine-41-drum" style but >= 12 chars as the API requires.
const WORDS = ["pine", "drum", "lake", "fern", "atlas", "comet", "ember", "harbor", "maple", "quartz", "river", "sage", "tulip", "violet"];
export function generatePassword() {
  const random = (max) => crypto.getRandomValues(new Uint32Array(1))[0] % max;
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const prefix = `${letters[random(letters.length)]}${"abcdefghijkmnpqrstuvwxyz"[random(24)]}${random(10)}`;
  return `${prefix}-${WORDS[random(WORDS.length)]}-${10 + random(90)}-${WORDS[random(WORDS.length)]}`;
}
