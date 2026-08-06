import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';

/**
 * 027-platform-role-redesign (T040c) — every authorization tree a census
 * surface (`a.row.surfaces.ts`) can be anchored on. Not exhaustive of the
 * whole codebase's authorization trees — only the ones this feature's 21
 * live A-rows actually anchor on, plus `root` for the cascade declaration
 * itself.
 *
 * The seven canonical trees below (`platform` … `virtual-assistant`) are
 * research C3's "seven trees inheriting the root policy" — verified by
 * grepping every call site of
 * `PlatformAuthorizationPolicyService.inheritRootAuthorizationPolicy()`:
 * `platform`, `user`, `organization`, `account`, `space`,
 * `virtual-contributor`, `virtual-assistant`. `forum` / `library` /
 * `templates-manager` / `role-set` / `storage` / `messaging` hang off
 * `platform` itself (research C2) — they inherit the root cascade
 * TRANSITIVELY through `platform`, and are also where the (Slice-A-only)
 * `global-support` platform-subtree cascade lands directly.
 *
 * The remaining entries are trees this feature's census anchors surfaces on
 * that are NOT part of either cascade — most are per-resolver SYNTHETIC
 * policies (a fixed, in-memory `IAuthorizationPolicy` built once in a
 * resolver's constructor from a hardcoded credential list, never persisted,
 * never touched by `authorizationPolicyReset*` — the same shape T034a uses
 * for the FR-022 pin). Declaring them here keeps every census `tree` value
 * meaningful without pretending they participate in the two named cascades.
 */
export type TreeId =
  // The root policy prototype itself — merged into (not a member of) the
  // seven trees below via `inheritRootAuthorizationPolicy()`. Used as the
  // `anchor` for privileges declared directly on the root rule
  // (`PLATFORM_CONTENT_FULL_ACCESS`).
  | 'root'
  // The seven direct root-inheritors (research C3).
  | 'platform'
  | 'user'
  | 'organization'
  | 'account'
  | 'space'
  | 'virtual-contributor'
  | 'virtual-assistant'
  // Hang off `platform` (research C2) — reached by the root cascade only
  // transitively through it, and reached by the `global-support`
  // platform-subtree cascade directly.
  | 'forum'
  | 'library'
  | 'templates-manager'
  | 'role-set'
  | 'storage'
  | 'messaging'
  // Anchored elsewhere in the domain, outside both cascades.
  | 'licensing-framework'
  | 'license-policy'
  | 'ai-server'
  // corr-server-9 fix: `transferCallout`'s TRANSFER_RESOURCE_OFFER/_ACCEPT
  // are checked on the CalloutsSet's OWN authorization
  // (`callouts.set.service.authorization.ts`), a DIFFERENT credential rule
  // — and a different legacy reacher (`global-support-manager`, not
  // `global-support`) — than the `account`-tree rule the other four A9
  // transfer mutations share (`account.service.authorization.ts`). The two
  // trees cannot share one flat `PRIVILEGE_GRANTS` entry for the same
  // privilege names (research: two independent grant sets, one privilege
  // pair) — split into its own tree-scoped anchor.
  | 'callouts-set'
  // Per-resolver SYNTHETIC policies — fixed, in-memory, never persisted,
  // never reset. Named per resolver so a reviewer can find the constructor
  // that builds it.
  | 'credential-admin-synthetic' // admin.authorization.resolver.mutations.ts (T034a pin)
  | 'conversion-admin-synthetic' // conversion.resolver.mutations.ts (space/VC move family)
  | 'communication-admin-synthetic'; // admin.communication.resolver.mutations.ts

/**
 * The root policy's replacement rule (T036), added ALONGSIDE the legacy
 * god-mode rule (never narrowing before the replacement exists — the
 * eleventh analyze pass's ordering requirement). **Reversed at the ninth
 * `/speckit-analyze` pass** (FR-004/SC-004, spec-server-1 fix): carries full
 * `CREATE`/`READ`/`UPDATE`/`DELETE` plus `PLATFORM_CONTENT_FULL_ACCESS` — a
 * deliberate, signed-off widening that ALSO satisfies the owner branch of
 * A6/A7's `anyOf` dual-path gates (accepted as SC-004's single named
 * exception; see `a.row.surfaces.ts`'s A6/A7 `acceptedExtraReachers`).
 * `UPDATE_NAMEID` stays absent BY DESIGN: A17 is owned by NO global role
 * (spec row 2, FR-020), so cascading it would hand Content Full Access
 * entity renames the spec explicitly denies it.
 *
 * Reaches the seven direct root-inheritors. `GLOBAL_SUPPORT` is
 * deliberately NOT a Slice A credential here (sec-server-3/corr-server-2
 * fix): unlike `GLOBAL_ADMIN`, it never held blanket CRUD across these
 * seven trees before this feature — only the platform-SUBTREE cascade
 * (`LEGACY_CASCADES.globalSupportPlatformSubtree` below, which does not
 * reach the other six) and per-space, flag-gated privileges
 * (`allowPlatformSupportAsAdmin`). Adding it here would bypass that
 * per-space consent gate platform-wide.
 *
 * `Slice B` (T072, DONE) deleted the legacy `global-admin` CRUD+GRANT rule
 * entirely and narrowed this rule's credential list to
 * `platform-content-full-access` alone. Both slices stay declared here on
 * purpose: `reachability.spec.ts` (T070m) asserts derived ≡ intended in
 * BOTH, so the Slice A shape remains the checked history of what was
 * removed rather than dead prose.
 */
export const ROOT_CASCADE: {
  readonly privileges: readonly AuthorizationPrivilege[];
  readonly trees: readonly TreeId[];
  /** Credentials reaching the cascade in EACH slice — both are declared
   * here (rather than only in `privilege.grants.ts`) because the root rule
   * is a single credential rule whose CREDENTIAL LIST changes shape between
   * slices (Slice A: content-full-access ∪ global-admin;
   * Slice B: content-full-access alone, T072). */
  readonly credentialsBySlice: {
    readonly A: readonly AuthorizationCredential[];
    readonly B: readonly AuthorizationCredential[];
  };
} = {
  privileges: [
    AuthorizationPrivilege.CREATE,
    AuthorizationPrivilege.READ,
    AuthorizationPrivilege.UPDATE,
    AuthorizationPrivilege.DELETE,
    AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS,
  ],
  trees: [
    'platform',
    'user',
    'organization',
    'account',
    'space',
    'virtual-contributor',
    'virtual-assistant',
  ],
  credentialsBySlice: {
    A: [AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS],
    B: [AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS],
  },
};

/**
 * 027-platform-role-redesign (T083a, Slice B): `LEGACY_CASCADES` is DELETED.
 *
 * It modelled the two cascades that existed only while the feature ran
 * additively — `global-admin`'s root CRUD+GRANT god mode (removed at T072) and
 * `global-support`'s platform-subtree CRUD (removed at T073) — so that
 * `reachers()` could derive each surface's Slice A reacher set and
 * `reachability.spec.ts` could check the census's `legacyReachers` against it
 * rather than trusting it.
 *
 * Both cascades are gone from the code AND both credentials are gone from
 * `AuthorizationCredential` (T077), so the model is no longer expressible, let
 * alone checkable. Every census surface now declares `legacyReachers: []` and
 * `reachers()` derives the same empty set from `ROOT_CASCADE` alone. Do not
 * reintroduce this constant to "document what used to be reachable": a
 * cascade model that cannot fail a build is prose, and prose about a deleted
 * grant path belongs in the spec, not in the verification layer.
 */
