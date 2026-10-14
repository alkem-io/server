import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';

/**
 * The closed vocabulary a census entry's `gate` can be written in.
 *
 * `reachers()` INTERSECTS every component of a gate with the
 * explicit-grant / cascade model to derive who actually reaches a surface.
 * A privilege-only vocabulary is not enough: a row can be gated on
 * something that is not a privilege check at all, and modelling it as if
 * it were would make the derivation confidently wrong rather than visibly
 * incomplete.
 *
 * Exactly three shapes, closed:
 *
 * 1. `{ requires: P }` — the ordinary REPLACEMENT gate. Satisfied by
 *    holding `P` (by explicit grant or cascade). Most A-rows take this
 *    shape: a purpose-built privilege per family.
 *
 * 2. `{ anyOf: [P, Q] }` — the DUAL PATH. Satisfied by
 *    holding EITHER member. This is the shape shared by A6 (`DELETE` ∨
 *    `DELETE_ORGANIZATION`), A7 (`UPDATE` ∨ `PLATFORM_SUPPORT_ORG_RESOURCES`)
 *    and A8 (`DELETE` ∨ `PLATFORM_CONTENT_FULL_ACCESS`): the resource's own
 *    owner keeps the ordinary CRUD privilege, the platform role reaches the
 *    same mutation through its own privilege, and this shape is what makes
 *    `reachers()` RETURN the fact three review passes had to establish by
 *    hand.
 *
 * 3. `{ condition: name; reason }` — a NAMED RUNTIME CONDITION that is not a
 *    platform privilege at all. This is A15's in-space support surface: the
 *    real check is the per-space `allowPlatformSupportAsAdmin` setting
 *    (`space.service.platform.roles.access.ts`), not a privilege grant. A
 *    privilege-only entry here would make the derivation report Platform
 *    Support as reaching EVERY space, with the true predicate declared
 *    nowhere.
 *
 * `reason` is REQUIRED on the `condition` component — its enforcement is a
 * written decision, not a privilege lookup, and a reviewer must be able to
 * read why without following it back to the code.
 */
export type GateExpr =
  | { readonly requires: AuthorizationPrivilege }
  | { readonly anyOf: readonly AuthorizationPrivilege[] }
  | {
      readonly condition: string;
      readonly reason: string;
    };

/** Type guards — used by `reachability.ts` (T040d) and `surface.drift.spec.ts`
 * (T052a) to narrow the closed union without a `switch` fallthrough gap. */

export function isRequiresGate(
  gate: GateExpr
): gate is Extract<GateExpr, { requires: AuthorizationPrivilege }> {
  return 'requires' in gate;
}

export function isAnyOfGate(
  gate: GateExpr
): gate is Extract<GateExpr, { anyOf: readonly AuthorizationPrivilege[] }> {
  return 'anyOf' in gate;
}

export function isConditionGate(
  gate: GateExpr
): gate is Extract<GateExpr, { condition: string; reason: string }> {
  return 'condition' in gate;
}

/** Every `AuthorizationPrivilege` named by a gate — empty for the
 * non-privilege `condition` component, which names no privilege at all. Used by
 * `reachability.ts` to intersect grants/cascades, and by
 * `surface.drift.spec.ts` to DERIVE `SCANNED_PRIVILEGES` from the census
 * rather than hand-list it (eighth clarification pass). */
export function privilegesNamedByGate(
  gate: GateExpr
): readonly AuthorizationPrivilege[] {
  if (isRequiresGate(gate)) {
    return [gate.requires];
  }
  if (isAnyOfGate(gate)) {
    return gate.anyOf;
  }
  return [];
}
