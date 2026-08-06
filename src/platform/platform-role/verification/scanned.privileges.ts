import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { A_ROW_SURFACES } from './a.row.surfaces';
import { privilegesNamedByGate } from './gate.model';

/**
 * 027-platform-role-redesign (T052a, eighth clarification pass) — split out
 * of `surface.drift.spec.ts` only because Biome's `noExportsInTest` forbids
 * exporting from a `*.spec.ts` file; the derivation itself belongs
 * conceptually to the drift detector, not to the model layer (T040c/T040d).
 *
 * Baseline CRUD verbs plus the retiring catch-all are excluded even though
 * they are named in some census gate expressions (A6/A7/A8's `anyOf` owner
 * branch, A9's three resolver-local-policy conversion mutations, A13's
 * bare-CRUD-gated license definitions, A16's plain `READ`) — see
 * `surface.drift.spec.ts`'s doc comment, stated limit 2, for why: these six
 * are the vocabulary reused by every ordinary, non-administrative gate
 * across this ~3k-file codebase, and scanning them by literal privilege
 * name would flag dozens of files unrelated to this feature's eight admin
 * families.
 */
export const EXCLUDED_FROM_SCAN: ReadonlySet<AuthorizationPrivilege> = new Set([
  AuthorizationPrivilege.CREATE,
  AuthorizationPrivilege.READ,
  AuthorizationPrivilege.UPDATE,
  AuthorizationPrivilege.DELETE,
  AuthorizationPrivilege.GRANT,
  // T074 (Slice B): `PLATFORM_ADMIN` is no longer listed — it no longer
  // exists. Its blanket exclusion (and the narrow rule-1b allowlist below that
  // compensated for it) was this census's one documented blind spot, and the
  // ~26 gates hiding inside it are exactly what T074 had to re-anchor by hand.
]);

/**
 * 027-platform-role-redesign (sec-server-5 fix, round 2 of 2) — `PLATFORM_ADMIN`
 * STAYS in `EXCLUDED_FROM_SCAN` above (globally): ~24 files across this
 * ~3k-file codebase reference it for entirely unrelated, pre-existing
 * purposes, so narrowing the blanket exclusion itself would flag every one
 * of them. Instead, this allowlist powers a SEPARATE, narrow check
 * (`surface.drift.spec.ts` rule 1b) that scans ONLY these specific
 * credential-administration files for a `PLATFORM_ADMIN` gate-position hit
 * and requires it to be censused — closing the exact structural gap that
 * let sec-server-9's `grantCredentialToActor`/`revokeCredentialFromActor`
 * survive three review rounds invisible to `SCANNED_PRIVILEGES`.
 *
 * Add a file here ONLY when it (a) gates on `PLATFORM_ADMIN` AND (b) writes
 * or reads this feature's own role/credential vocabulary — not merely
 * "any file using PLATFORM_ADMIN", which is the blast radius the blanket
 * exclusion exists to avoid.
 */
export const PLATFORM_ADMIN_SCAN_ALLOWLIST: ReadonlySet<string> = new Set([
  'src/domain/actor/actor/actor.resolver.mutations.ts',
  'src/platform-admin/domain/authorization/admin.authorization.resolver.mutations.ts',
]);

/**
 * DERIVED from the census — every privilege named in any `A_ROW_SURFACES`
 * entry's `gate` expression, minus `EXCLUDED_FROM_SCAN`. This supersedes
 * the thirteenth analyze pass's "pin it as data" instruction: the
 * previously hand-pinned set (T007's 11 new privileges plus
 * `PLATFORM_ROLES_ASSIGN`) is now this set's EXPECTED CONTENT, not its
 * definition — a surface added to the census extends the scan by
 * construction, so the vocabulary cannot independently drift from what is
 * actually declared.
 */
export const SCANNED_PRIVILEGES: readonly AuthorizationPrivilege[] = (() => {
  const found = new Set<AuthorizationPrivilege>();
  for (const surfaces of Object.values(A_ROW_SURFACES)) {
    for (const surface of surfaces) {
      for (const privilege of privilegesNamedByGate(surface.gate)) {
        if (!EXCLUDED_FROM_SCAN.has(privilege)) {
          found.add(privilege);
        }
      }
    }
  }
  return [...found].sort();
})();

/** Reverse-lookup: `AuthorizationPrivilege` value → its enum member name,
 * so callers can match the literal `AuthorizationPrivilege.MEMBER_NAME`
 * source token rather than the runtime string value (which does not appear
 * verbatim in source). */
const PRIVILEGE_ENUM_KEYS: ReadonlyMap<string, string> = new Map(
  Object.entries(AuthorizationPrivilege).map(([key, value]) => [
    value as string,
    key,
  ])
);

export function privilegeEnumKey(privilege: AuthorizationPrivilege): string {
  const key = PRIVILEGE_ENUM_KEYS.get(privilege);
  if (!key) {
    throw new Error(`No enum key found for privilege value "${privilege}"`);
  }
  return key;
}
