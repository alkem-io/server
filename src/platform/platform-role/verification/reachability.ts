import type { AuthorizationCredential } from '@common/enums/authorization.credential';
import type { SurfaceRef } from './a.row.surfaces';
import { ROOT_CASCADE, type TreeId } from './cascade.model';
import {
  isAnyOfGate,
  isConditionGate,
  isRequiresGate,
  privilegesNamedByGate,
} from './gate.model';
import {
  grantedCredentials,
  isManagedPrivilege,
  TREE_SCOPED_PRIVILEGE_GRANTS,
} from './privilege.grants';

/**
 * ONE pure function, no I/O, no Nest DI: given a surface, return every
 * credential that ACTUALLY reaches it, computed from the gate expression plus
 * the explicit-grant (`privilege.grants.ts`) and cascade (`cascade.model.ts`)
 * model. This is a
 * DERIVATION, not a declaration — the census (`a.row.surfaces.ts`) states
 * INTENT; this function states FACT, and `reachability.spec.ts` is what
 * asserts the two agree for every surface:
 * derived ≡ intendedOwners ∪ acceptedExtraReachers.
 *
 * Returns CREDENTIALS, never role names — an equality that
 * crossed vocabularies would land on silent-void identifiers. A consumer
 * needing a role name converts through the canonical `ROLE_CREDENTIAL_MAP`
 * (`platform.roles.access.service.ts`) — never a local cast.
 *
 * ## Gate shapes and how each is resolved
 *
 * - `{ requires: P }` / `{ anyOf: [P, Q, …] }` — resolved INDEPENDENTLY of
 *   the surface's own declared fields: the union, over every named
 *   privilege, of (a) the credentials `privilege.grants.ts` says hold that
 *   privilege (flat, plus any tree-scoped grant on the surface's own
 *   `tree`), and (b) the credentials reached via `ROOT_CASCADE` when it both
 *   names the privilege AND reaches the surface's `tree`. This is the ONLY
 *   branch with independent verification value — it is what makes "does
 *   the derived set equal the declared intent" a real question rather than
 *   a tautology.
 *
 * - `{ condition: name }` — by construction NOT independently re-derivable
 *   from a generic privilege/cascade model: a named runtime condition (A15's
 *   `allowPlatformSupportAsAdmin`) is enforced by bespoke code that checks a
 *   SPECIFIC credential, not a privilege lookup. For this shape, `reachers()`
 *   returns the surface's own declared `intendedOwners` ∪
 *   `acceptedExtraReachers` — which makes `reachability.spec.ts`'s equality
 *   trivially true FOR THESE ROWS BY DESIGN. That is not a gap:
 *   `surface.drift.spec.ts`'s rule 3 is the layer that checks a
 *   `{condition}` DECLARATION against the ENFORCED code, in both
 *   directions — the two layers are complements, not
 *   duplicates.
 */
export function reachers(
  surface: SurfaceRef
): readonly AuthorizationCredential[] {
  const gate = surface.gate;

  if (isConditionGate(gate)) {
    return declaredReachers(surface);
  }
  if (isRequiresGate(gate) || isAnyOfGate(gate)) {
    const privileges = privilegesNamedByGate(gate);
    const result = new Set<AuthorizationCredential>();

    for (const privilege of privileges) {
      if (isManagedPrivilege(privilege)) {
        for (const credential of grantedCredentials(privilege)) {
          result.add(credential);
        }
      }

      // Tree-scoped grants — the census rows whose literal gate is a
      // baseline CRUD verb (or a resolver-local synthetic policy's privilege)
      // reused too promiscuously elsewhere to manage globally (A9's moves
      // and transfers, A6's verification, A12, A13). Scoped to the surface's
      // OWN tree so this cannot leak into A6/A7/A8's unrelated `anyOf` gates
      // over the same literal privileges.
      const treeScoped =
        TREE_SCOPED_PRIVILEGE_GRANTS[surface.tree]?.[privilege];
      if (treeScoped) {
        for (const credential of treeScoped.owningCredentials) {
          result.add(credential);
        }
      }

      // The root content rule — `ROOT_CASCADE.credentials`.
      if (
        ROOT_CASCADE.privileges.includes(privilege) &&
        reachesTree(ROOT_CASCADE.trees, surface.tree)
      ) {
        for (const credential of ROOT_CASCADE.credentials) {
          result.add(credential);
        }
      }
    }

    return dedupe([...result]);
  }

  // Exhaustiveness — GateExpr is a closed union of exactly three shapes
  // (gate.model.ts). If `tsc` ever complains here, a fourth shape was added
  // to the union without teaching this function about it.
  const exhaustive: never = gate;
  throw new Error(
    `reachers(): unreachable — unknown gate shape ${JSON.stringify(exhaustive)}`
  );
}

function reachesTree(cascadeTrees: readonly TreeId[], tree: TreeId): boolean {
  return cascadeTrees.includes(tree);
}

/** The `{condition}` branch — see the class doc comment
 * above for why this is the surface's own declared fields rather than an
 * independent derivation. */
function declaredReachers(
  surface: SurfaceRef
): readonly AuthorizationCredential[] {
  return dedupe([
    ...surface.intendedOwners,
    ...(surface.acceptedExtraReachers?.map(r => r.credential) ?? []),
  ]);
}

function dedupe(
  credentials: readonly AuthorizationCredential[]
): readonly AuthorizationCredential[] {
  return [...new Set(credentials)];
}
