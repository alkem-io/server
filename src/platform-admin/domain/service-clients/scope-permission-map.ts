import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';

/**
 * 004 T031 — Scope-to-resolver-permission map (research.md R-8).
 *
 * Translates a v1 catalogue scope into the `AuthorizationPrivilege` enum
 * values the platform's existing resolver-level guard already
 * understands. Consulted ONLY on the service-principal branch of
 * `HydraBearerStrategy` (T032) — cookie-session and user-bearer paths
 * are unaffected.
 *
 * Adding a scope or rebinding an existing one is a single-file change
 * here plus a lifecycle audit event (`addPlatformScope` /
 * `setPlatformScopeBaselineMembership`); no resolver touch.
 *
 * v1 catalogue (per research.md R-1):
 *   - `platform:read`        — READ on Platform / Space / Organization /
 *                              User / Profile (5-entry projection)
 *   - `analytics:read`       — READ on the analytics resources (uses the
 *                              READ privilege; the analytics subsystem
 *                              has no dedicated READ_ANALYTICS enum
 *                              value in the current platform — see
 *                              divergence note below)
 *   - `health:read`          — READ on Platform (health/version)
 *   - `platform:write`       — CREATE / UPDATE / DELETE on Platform /
 *                              Space / Organization
 *   - `analytics:write`      — CONTRIBUTE on analytics (uses CONTRIBUTE
 *                              privilege; see divergence note below)
 *   - `notifications:write`  — RECEIVE_NOTIFICATIONS_ADMIN (the
 *                              closest-match enum value — there is no
 *                              `EMIT_NOTIFICATION` in the current
 *                              platform; see divergence note below)
 *   - `space:admin`          — PLATFORM_ADMIN on Space
 *
 * Divergence note (research.md R-8 vs `AuthorizationPrivilege` enum):
 * R-8 names `READ_ANALYTICS`, `WRITE_ANALYTICS`, `EMIT_NOTIFICATION` as
 * if they were existing privilege enum values. Inspecting
 * `src/common/enums/authorization.privilege.ts` shows these names do
 * NOT exist in the platform enum today. The mapping below picks the
 * closest existing privilege for each — the analytics service is
 * read-only against READ in the codebase, write paths flow through
 * CONTRIBUTE, and notification emission is gated by the
 * `RECEIVE_NOTIFICATIONS_*` family. If a dedicated privilege is added
 * later this map is the one place that needs updating.
 */

export interface ResourcePrivilege {
  resource: string;
  privilege: AuthorizationPrivilege;
}

const PLATFORM_READ: readonly ResourcePrivilege[] = Object.freeze([
  { resource: 'Platform', privilege: AuthorizationPrivilege.READ },
  { resource: 'Space', privilege: AuthorizationPrivilege.READ },
  { resource: 'Organization', privilege: AuthorizationPrivilege.READ },
  { resource: 'User', privilege: AuthorizationPrivilege.READ },
  { resource: 'Profile', privilege: AuthorizationPrivilege.READ },
]);

const ANALYTICS_READ: readonly ResourcePrivilege[] = Object.freeze([
  { resource: 'Analytics', privilege: AuthorizationPrivilege.READ },
]);

const HEALTH_READ: readonly ResourcePrivilege[] = Object.freeze([
  { resource: 'Platform', privilege: AuthorizationPrivilege.READ },
]);

const PLATFORM_WRITE: readonly ResourcePrivilege[] = Object.freeze([
  { resource: 'Platform', privilege: AuthorizationPrivilege.CREATE },
  { resource: 'Platform', privilege: AuthorizationPrivilege.UPDATE },
  { resource: 'Platform', privilege: AuthorizationPrivilege.DELETE },
  { resource: 'Space', privilege: AuthorizationPrivilege.CREATE },
  { resource: 'Space', privilege: AuthorizationPrivilege.UPDATE },
  { resource: 'Space', privilege: AuthorizationPrivilege.DELETE },
  { resource: 'Organization', privilege: AuthorizationPrivilege.CREATE },
  { resource: 'Organization', privilege: AuthorizationPrivilege.UPDATE },
  { resource: 'Organization', privilege: AuthorizationPrivilege.DELETE },
]);

const ANALYTICS_WRITE: readonly ResourcePrivilege[] = Object.freeze([
  { resource: 'Analytics', privilege: AuthorizationPrivilege.CONTRIBUTE },
]);

const NOTIFICATIONS_WRITE: readonly ResourcePrivilege[] = Object.freeze([
  {
    resource: 'Notifications',
    privilege: AuthorizationPrivilege.RECEIVE_NOTIFICATIONS_ADMIN,
  },
]);

const SPACE_ADMIN: readonly ResourcePrivilege[] = Object.freeze([
  { resource: 'Space', privilege: AuthorizationPrivilege.PLATFORM_ADMIN },
]);

const SCOPE_MAP: Readonly<Record<string, readonly ResourcePrivilege[]>> =
  Object.freeze({
    'platform:read': PLATFORM_READ,
    'analytics:read': ANALYTICS_READ,
    'health:read': HEALTH_READ,
    'platform:write': PLATFORM_WRITE,
    'analytics:write': ANALYTICS_WRITE,
    'notifications:write': NOTIFICATIONS_WRITE,
    'space:admin': SPACE_ADMIN,
  });

/**
 * Returns the resource-privilege pairs that holding `scope` grants. An
 * unknown scope returns an empty list (the resolver guard then denies);
 * the catalogue uniqueness invariant means an unknown scope at this
 * layer is a configuration drift, not a runtime expectation.
 */
export function scopeToPrivileges(scope: string): ResourcePrivilege[] {
  const found = SCOPE_MAP[scope];
  return found ? [...found] : [];
}

/**
 * Convenience aggregator: returns the unique privilege set across a list
 * of scopes. Resource discriminator is preserved (one entry per
 * resource-privilege pair).
 */
export function scopesToPrivileges(scopes: string[]): ResourcePrivilege[] {
  const seen = new Set<string>();
  const out: ResourcePrivilege[] = [];
  for (const scope of scopes) {
    for (const rp of scopeToPrivileges(scope)) {
      const key = `${rp.resource}:${rp.privilege}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(rp);
    }
  }
  return out;
}

export const KNOWN_PLATFORM_SCOPES: readonly string[] = Object.freeze(
  Object.keys(SCOPE_MAP)
);
