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
 * TRANSITIVELY through `platform`.
 *
 * The remaining entries are trees this feature's census anchors surfaces on
 * that are NOT part of the root cascade — most are per-resolver SYNTHETIC
 * policies (a fixed, in-memory `IAuthorizationPolicy` built once in a
 * resolver's constructor from a hardcoded credential list, never persisted,
 * never touched by `authorizationPolicyReset*`). Declaring them here keeps every census `tree` value
 * meaningful without pretending they participate in the root cascade.
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
  // transitively through it.
  | 'forum'
  | 'library'
  | 'templates-manager'
  | 'role-set'
  | 'storage'
  | 'messaging'
  // Anchored elsewhere in the domain, outside the root cascade.
  | 'licensing-framework'
  | 'license-policy'
  | 'ai-server'
  // corr-server-9 fix: `transferCallout`'s TRANSFER_RESOURCE_OFFER/_ACCEPT
  // are checked on the CalloutsSet's OWN authorization
  // (`callouts.set.service.authorization.ts`), a DIFFERENT credential rule
  // than the `account`-tree rule the other four A9
  // transfer mutations share (`account.service.authorization.ts`). The two
  // trees cannot share one flat `PRIVILEGE_GRANTS` entry for the same
  // privilege names (research: two independent grant sets, one privilege
  // pair) — split into its own tree-scoped anchor.
  | 'callouts-set'
  // QA server-C2-d: the organization verification policy is `reset()` and
  // built from its own credential rules alone
  // (`organization.verification.service.authorization.ts`) — it inherits
  // NEITHER the root cascade nor the organization's policy, so it cannot
  // share the `organization` tree's cascade reach.
  | 'organization-verification'
  // Per-resolver SYNTHETIC policies — fixed, in-memory, never persisted,
  // never reset. Named per resolver so a reviewer can find the constructor
  // that builds it.
  | 'conversion-admin-synthetic' // conversion.resolver.mutations.ts (space/VC move family)
  | 'communication-admin-synthetic'; // admin.communication.resolver.mutations.ts

/**
 * The root policy's content rule: carries full `CREATE`/`READ`/`UPDATE`/
 * `DELETE` plus `PLATFORM_CONTENT_FULL_ACCESS` — a deliberate, signed-off
 * widening that ALSO satisfies the owner branch of A6/A7's `anyOf` dual-path
 * gates (the single named exception; see `a.row.surfaces.ts`'s A6/A7
 * `acceptedExtraReachers`). `UPDATE_NAMEID` stays absent BY DESIGN: A17 is
 * owned by NO global role, so cascading it would hand Content Full Access
 * entity renames the spec explicitly denies it.
 *
 * Reaches the seven direct root-inheritors. `platform-support` is
 * deliberately NOT a credential here: it holds no blanket CRUD across these
 * seven trees, only per-space, flag-gated privileges
 * (`allowPlatformSupportAsAdmin`). Adding it here would bypass that per-space
 * consent gate platform-wide.
 */
export const ROOT_CASCADE: {
  readonly privileges: readonly AuthorizationPrivilege[];
  readonly trees: readonly TreeId[];
  /** Credentials reaching the cascade — declared here (rather than only in
   * `privilege.grants.ts`) because the root rule is a single credential rule
   * whose credential list is `platform-content-full-access` alone. */
  readonly credentials: readonly AuthorizationCredential[];
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
  credentials: [AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS],
};
