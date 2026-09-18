import type { AuthorizationCredential } from '@common/enums/authorization.credential';
import type { SurfaceRef } from './a.row.surfaces';
import { LEGACY_CASCADES, ROOT_CASCADE, type TreeId } from './cascade.model';
import {
  isAnyOfGate,
  isConditionGate,
  isCredentialGate,
  isRequiresGate,
  privilegesNamedByGate,
} from './gate.model';
import {
  grantedCredentials,
  isManagedPrivilege,
  PRIVILEGE_GRANTS,
  TREE_SCOPED_PRIVILEGE_GRANTS,
} from './privilege.grants';

/**
 * 027-platform-role-redesign (T040d, research D26/D27) — ONE pure function,
 * no I/O, no Nest DI: given a surface and a slice, return every credential
 * that ACTUALLY reaches it, computed from the gate expression plus the
 * explicit-grant (`privilege.grants.ts`) and cascade (`cascade.model.ts`)
 * model. This is a DERIVATION, not a declaration (workspace commit
 * 56e010d, "derive reachability, don't declare it") — the census
 * (`a.row.surfaces.ts`) states INTENT; this function states FACT, and
 * `reachability.spec.ts` (T070m, NOT built this wave) is what asserts the
 * two agree, in both slices, for every surface.
 *
 * Returns CREDENTIALS, never role names (research D27a) — `legacyReachers`
 * can only be credentials, and an equality that crossed vocabularies would
 * land on exactly the silent-void identifiers this feature exists to fix.
 * A consumer needing a role name converts through the FR-011-guarded
 * canonical `ROLE_CREDENTIAL_MAP`
 * (`platform.roles.access.service.ts`) — never a local cast.
 *
 * ## Gate shapes and how each is resolved
 *
 * - `{ requires: P }` / `{ anyOf: [P, Q, …] }` — resolved INDEPENDENTLY of
 *   the surface's own declared fields: the union, over every named
 *   privilege, of (a) the credentials `privilege.grants.ts` says hold that
 *   privilege in this slice, and (b) the credentials reached via a cascade
 *   (`ROOT_CASCADE`, plus the two Slice-A-only `LEGACY_CASCADES`) that both
 *   names the privilege AND reaches the surface's `tree`. This is the ONLY
 *   branch with independent verification value — it is what makes "does
 *   the derived set equal the declared intent" a real question rather than
 *   a tautology.
 *
 * - `{ credential: C }` / `{ condition: name }` — these two shapes are, by
 *   construction, NOT independently re-derivable from a generic
 *   privilege/cascade model: a credential pin names its own single
 *   permitted credential directly, and a named runtime condition (A15's
 *   `allowPlatformSupportAsAdmin`) is enforced by bespoke code that checks
 *   a SPECIFIC credential, not a privilege lookup. For these two, `reachers()`
 *   returns the surface's own declared `intendedOwners` ∪
 *   `acceptedExtraReachers` ∪ (Slice A only) `legacyReachers` — which makes
 *   `reachability.spec.ts`'s equality trivially true FOR THESE ROWS BY
 *   DESIGN. That is not a gap: `surface.drift.spec.ts`'s rule 3 (T052a) is
 *   the layer that checks a `{credential}` / `{condition}` DECLARATION
 *   against the ENFORCED code, in both directions — the two layers are
 *   complements (research D26), not duplicates.
 */
export function reachers(
  surface: SurfaceRef,
  slice: 'A' | 'B'
): readonly AuthorizationCredential[] {
  const gate = surface.gate;

  if (isCredentialGate(gate)) {
    return declaredReachers(surface, slice);
  }
  if (isConditionGate(gate)) {
    return declaredReachers(surface, slice);
  }
  if (isRequiresGate(gate) || isAnyOfGate(gate)) {
    const privileges = privilegesNamedByGate(gate);
    const result = new Set<AuthorizationCredential>();

    for (const privilege of privileges) {
      if (isManagedPrivilege(privilege)) {
        for (const credential of grantedCredentials(privilege, slice)) {
          result.add(credential);
        }
      }

      // Tree-scoped grants (T070m) — the three census rows whose literal
      // gate is a baseline CRUD verb or the legacy PLATFORM_ADMIN catch-all
      // reused too promiscuously elsewhere to manage globally (A9's
      // cross-L0 moves, A12, A13). Scoped to the surface's OWN tree so this
      // cannot leak into A6/A7/A8's unrelated `anyOf` gates over the same
      // literal privileges.
      const treeScoped =
        TREE_SCOPED_PRIVILEGE_GRANTS[surface.tree]?.[privilege];
      if (treeScoped) {
        for (const credential of treeScoped.owningCredentials) {
          result.add(credential);
        }
        if (slice === 'A') {
          for (const credential of treeScoped.legacyCredentials) {
            result.add(credential);
          }
        }
      }

      // The root replacement rule (both slices) — content-full-access
      // (+ the two legacy CRUD holders in Slice A only, per
      // `ROOT_CASCADE.credentialsBySlice`).
      if (
        ROOT_CASCADE.privileges.includes(privilege) &&
        reachesTree(ROOT_CASCADE.trees, surface.tree)
      ) {
        for (const credential of ROOT_CASCADE.credentialsBySlice[slice]) {
          result.add(credential);
        }
      }

      // The two Slice-A-only legacy cascades. Absent entirely at Slice B —
      // both are deleted outright (T072, T073), not merely narrowed.
      if (slice === 'A') {
        const { globalAdminRootCrud, globalSupportPlatformSubtree } =
          LEGACY_CASCADES;
        if (
          globalAdminRootCrud.privileges.includes(privilege) &&
          reachesTree(globalAdminRootCrud.trees, surface.tree)
        ) {
          result.add(globalAdminRootCrud.credential);
        }
        if (
          globalSupportPlatformSubtree.privileges.includes(privilege) &&
          reachesTree(globalSupportPlatformSubtree.trees, surface.tree)
        ) {
          result.add(globalSupportPlatformSubtree.credential);
        }
      }
    }

    return dedupe([...result]);
  }

  // Exhaustiveness — GateExpr is a closed union of exactly four shapes
  // (gate.model.ts). If `tsc` ever complains here, a fifth shape was added
  // to the union without teaching this function about it.
  const exhaustive: never = gate;
  throw new Error(
    `reachers(): unreachable — unknown gate shape ${JSON.stringify(exhaustive)}`
  );
}

function reachesTree(cascadeTrees: readonly TreeId[], tree: TreeId): boolean {
  return cascadeTrees.includes(tree);
}

/** The `{credential}` / `{condition}` branch — see the class doc comment
 * above for why this is the surface's own declared fields rather than an
 * independent derivation. */
function declaredReachers(
  surface: SurfaceRef,
  slice: 'A' | 'B'
): readonly AuthorizationCredential[] {
  return dedupe([
    ...surface.intendedOwners,
    ...(surface.acceptedExtraReachers?.map(r => r.credential) ?? []),
    ...(slice === 'A' ? surface.legacyReachers : []),
  ]);
}

function dedupe(
  credentials: readonly AuthorizationCredential[]
): readonly AuthorizationCredential[] {
  return [...new Set(credentials)];
}

/** Re-exported for consumers (`test-suites` T007a, this repo's
 * `reachability.spec.ts` T070m) that need to distinguish "this privilege
 * has an explicit grant-set declaration" from "it is cascade-only" without
 * importing `privilege.grants.ts` directly. */
export { PRIVILEGE_GRANTS };
