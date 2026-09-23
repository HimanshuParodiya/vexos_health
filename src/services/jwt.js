// Client-side JWT helpers. These only READ the token payload for UI decisions.
// The backend must always verify the signature and role on every request.

function base64UrlDecode(segment) {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function decodeJwt(token) {
  try {
    const [, payload] = token.split(".");
    return JSON.parse(base64UrlDecode(payload));
  } catch {
    return null;
  }
}

export function isTokenExpired(payload, skewSeconds = 30) {
  if (!payload?.exp) return true;
  return payload.exp - skewSeconds <= Math.floor(Date.now() / 1000);
}
