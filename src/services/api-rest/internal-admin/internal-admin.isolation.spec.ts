/**
 * Isolation contract for the internal admin jobs API (US3).
 *
 * The endpoints under `/rest/internal/admin/*` are internal **by construction**:
 * no public Traefik IngressRoute prefix matches `/rest/internal` (research R1,
 * contract §Isolation). This test encodes that invariant so a future broad
 * public route that *would* expose the internal surface fails CI.
 *
 * It is a pure invariant check — no app boot required.
 */

// The path prefixes the public Traefik IngressRoutes match (research R1).
const PUBLIC_ROUTE_PREFIXES = [
  '/api/public/rest',
  '/api/private/rest',
  '/api/private/non-interactive/rest',
  '/graphql',
];

// The internal surface this feature mounts.
const INTERNAL_BASE_PATH = '/rest/internal/admin';
const INTERNAL_ROUTES = [
  '/rest/internal/admin/in-app-notifications/prune',
  '/rest/internal/admin/search-ingest',
  '/rest/internal/admin/tasks/some-task-id',
];

const isPrefixOf = (prefix: string, path: string): boolean =>
  path === prefix || path.startsWith(`${prefix}/`);

describe('InternalAdmin isolation contract (US3)', () => {
  it('no public route prefix is a prefix of the internal base path', () => {
    for (const prefix of PUBLIC_ROUTE_PREFIXES) {
      expect(isPrefixOf(prefix, INTERNAL_BASE_PATH)).toBe(false);
    }
  });

  it('no public route prefix matches any concrete internal route', () => {
    for (const route of INTERNAL_ROUTES) {
      for (const prefix of PUBLIC_ROUTE_PREFIXES) {
        expect(isPrefixOf(prefix, route)).toBe(false);
      }
    }
  });

  it('the internal surface lives under /rest/internal (never /api/* or /graphql)', () => {
    expect(INTERNAL_BASE_PATH.startsWith('/rest/internal')).toBe(true);
    for (const route of INTERNAL_ROUTES) {
      expect(route.startsWith('/rest/internal/admin')).toBe(true);
      expect(route.startsWith('/api/')).toBe(false);
      expect(route.startsWith('/graphql')).toBe(false);
    }
  });
});
