// FR-024 — boot-time parse of BEARER_AUD_ALLOW_LIST. Comma-separated list of
// audience values acceptable on Hydra-issued JWTs. Empty entries are rejected
// (raises) since "no audience" silently disables the check; duplicates are
// warn-logged but tolerated (drift between env files happens).
//
// 004 T033 — extended with a service-client-aware audience check that
// consults the FR-014 cache. The static `BEARER_AUD_ALLOW_LIST` continues
// to carry the 003 RP audiences (cookie-session callback, BFF GraphQL,
// etc.); the cache supplies dynamic admission for every enabled
// service-client clientId. A disabled or absent catalogue row drops out
// of the allow-list within the 60 s cache TTL per FR-017.

import type { LoggerService } from '@nestjs/common';

export class BearerAudAllowListEmptyError extends Error {
  constructor() {
    super('BEARER_AUD_ALLOW_LIST is empty — refusing to boot Bearer path');
    this.name = 'BearerAudAllowListEmptyError';
  }
}

export function parseBearerAudAllowList(
  raw: string,
  logger?: LoggerService
): string[] {
  const seen = new Set<string>();
  const dupes: string[] = [];
  const out: string[] = [];
  for (const part of (raw ?? '').split(',')) {
    const v = part.trim();
    if (v.length === 0) continue;
    if (seen.has(v)) {
      dupes.push(v);
      continue;
    }
    seen.add(v);
    out.push(v);
  }
  if (out.length === 0) throw new BearerAudAllowListEmptyError();
  if (dupes.length > 0) {
    logger?.warn?.(
      `BEARER_AUD_ALLOW_LIST contained duplicate entries: ${dupes.join(', ')}`,
      'BearerAudAllowList'
    );
  }
  return out;
}

// 004 T033 — clientId shape per data-model §2 / research R-1. Only a
// candidate audience matching this regex is considered for the
// service-client branch; user-bearer audiences (URL-shaped, UUIDs, etc.)
// never match and stay on the static allow-list path.
const SERVICE_CLIENT_ID_RE = /^[a-z][a-z0-9-]{2,62}$/;

/**
 * Minimal projection of `CachedServiceClient` needed for the admission
 * decision. Kept here (not imported from the platform-admin layer) so
 * this module has no import-time dependency on 004 wiring — the
 * `HydraBearerStrategy` constructs the lookup result and passes it
 * through; this file only inspects the `status` field.
 */
export interface ServiceClientAudienceView {
  status: 'enabled' | 'disabled';
  audience: string;
}

/**
 * Returns `true` iff `candidate` is an admissible audience. Three paths:
 *
 *  1. `candidate` is on the static 003 allow-list → admit (legacy).
 *  2. `candidate` matches the service-client clientId regex AND a
 *     `serviceClientView` was resolved AND its `status === 'enabled'`
 *     AND `serviceClientView.audience === candidate` (spec invariant
 *     `audience = client_id` from data-model §2) → admit.
 *  3. Otherwise → deny.
 *
 * The strategy passes `serviceClientView` ONLY when its own
 * `serviceClientCacheService.lookup(candidate)` already resolved. This
 * keeps the cache responsibility at the strategy layer and leaves this
 * module a pure projection function (easy to unit-test).
 */
export function isServiceClientAudienceAllowed(
  candidate: string,
  staticAllowList: string[],
  serviceClientView?: ServiceClientAudienceView | null
): boolean {
  if (staticAllowList.includes(candidate)) return true;
  if (!SERVICE_CLIENT_ID_RE.test(candidate)) return false;
  if (!serviceClientView) return false;
  if (serviceClientView.status !== 'enabled') return false;
  return serviceClientView.audience === candidate;
}
