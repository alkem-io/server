import { createRemoteJWKSet, type JWTVerifyGetKey } from 'jose';

// FR-036a — alkemio-server readiness MUST check Hydra JWKS cache freshness.
// `jose`'s `createRemoteJWKSet` does not expose its internal cache age, so we
// wrap the returned `JWTVerifyGetKey` and stamp `lastRefreshAt` on every
// successful key resolution. A successful resolution either (a) hit the cache
// (cache is fresh) or (b) re-fetched JWKS over HTTP — both prove the JWKS
// surface is healthy, which is what the readiness signal is for.
//
// The spec ceiling is 2 × max-age = 172 800 s (48 h) given FR-001's 86 400 s
// max-age. If `lastRefreshAt` is older than that, readiness flips to 503 so
// k8s drops the pod from rotation rather than have it reject Bearer tokens
// with an unknown `kid`.
export const JWKS_FRESHNESS_MAX_AGE_S = 172_800; // 48 h

export type JwksFreshnessHandle = {
  /** The wrapped `JWTVerifyGetKey` — pass to `jwtVerify`. */
  readonly getKey: JWTVerifyGetKey;
  /**
   * Epoch seconds of the most recent successful key resolution, or `null`
   * when no resolution has happened yet (fresh process, not yet probed).
   */
  lastRefreshAt(): number | null;
};

export function createJwksFreshnessHandle(
  jwksUrl: URL | string,
  options?: { now?: () => number }
): JwksFreshnessHandle {
  const url = typeof jwksUrl === 'string' ? new URL(jwksUrl) : jwksUrl;
  const innerGetKey = createRemoteJWKSet(url);
  const now = options?.now ?? (() => Math.floor(Date.now() / 1000));
  let lastRefreshAtS: number | null = null;

  const wrappedGetKey: JWTVerifyGetKey = async (protectedHeader, token) => {
    const key = await innerGetKey(protectedHeader, token);
    // Only stamp on success — a thrown error indicates JWKS is unreachable
    // or the kid is unknown, which is exactly what the readiness signal is
    // meant to catch.
    lastRefreshAtS = now();
    return key;
  };

  return {
    getKey: wrappedGetKey,
    lastRefreshAt: () => lastRefreshAtS,
  };
}

export function jwksAgeSeconds(
  handle: JwksFreshnessHandle,
  now: () => number = () => Math.floor(Date.now() / 1000)
): number | null {
  const last = handle.lastRefreshAt();
  if (last === null) return null;
  return now() - last;
}
