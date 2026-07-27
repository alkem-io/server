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
  // Per-resolver SYNTHETIC policies — fixed, in-memory, never persisted,
  // never reset. Named per resolver so a reviewer can find the constructor
  // that builds it.
  | 'credential-admin-synthetic' // admin.authorization.resolver.mutations.ts (T034a pin)
  | 'conversion-admin-synthetic' // conversion.resolver.mutations.ts (space/VC move family)
  | 'communication-admin-synthetic'; // admin.communication.resolver.mutations.ts

/**
 * The root policy's replacement rule (T036), added ALONGSIDE the legacy
 * god-mode rule (never narrowing before the replacement exists — the
 * eleventh analyze pass's ordering requirement). Deliberately carries ONLY
 * `READ` and `PLATFORM_CONTENT_FULL_ACCESS` — `CREATE`/`UPDATE`/`DELETE`
 * and `UPDATE_NAMEID` are absent BY DESIGN (privilege-map.md §"The root rule
 * is..."): cascading them would satisfy the owner branch of every
 * `anyOf` dual-path gate (A6, A7, A8) and hand Content Full Access
 * capabilities spec.md row 2 denies it.
 *
 * Reaches the seven direct root-inheritors. `Slice B` (T072) deletes the
 * legacy `global-admin` CRUD+GRANT rule entirely and narrows this rule's
 * credential list to `platform-content-full-access` alone — update THIS
 * declaration in the same commit as that task, so `reachability.spec.ts`
 * (T070m, not built this wave) re-derives against the Slice B shape rather
 * than silently checking the Slice A one forever.
 */
export const ROOT_CASCADE: {
  readonly privileges: readonly AuthorizationPrivilege[];
  readonly trees: readonly TreeId[];
  /** Credentials reaching the cascade in EACH slice — both are declared
   * here (rather than only in `privilege.grants.ts`) because the root rule
   * is a single credential rule whose CREDENTIAL LIST changes shape between
   * slices (Slice A: content-full-access ∪ the two legacy CRUD holders;
   * Slice B: content-full-access alone, T072). */
  readonly credentialsBySlice: {
    readonly A: readonly AuthorizationCredential[];
    readonly B: readonly AuthorizationCredential[];
  };
} = {
  privileges: [
    AuthorizationPrivilege.READ,
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
    A: [
      AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS,
      AuthorizationCredential.GLOBAL_ADMIN,
      AuthorizationCredential.GLOBAL_SUPPORT,
    ],
    B: [AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS],
  },
};

/**
 * The two legacy cascades that exist ONLY in Slice A — both deleted at
 * Slice B (T072 for the root's CRUD+GRANT half, T073 for the platform
 * subtree), which is why there is no `credentialsBySlice` field here: at
 * Slice B, neither credential reaches anything through EITHER cascade (the
 * rows are dropped outright at T076/T077, not merely narrowed).
 */
export const LEGACY_CASCADES: {
  /** `global-admin`'s root CRUD+GRANT god-mode rule
   * (`platform.authorization.policy.service.ts`, deleted at T072). */
  readonly globalAdminRootCrud: {
    readonly credential: AuthorizationCredential;
    readonly privileges: readonly AuthorizationPrivilege[];
    readonly trees: readonly TreeId[];
  };
  /** `global-support`'s platform-SUBTREE CRUD cascade
   * (`platform.service.authorization.ts`'s `globalSupportPlatformAdmin`
   * rule, deleted at T073). Reaches `platform` itself and everything that
   * hangs off it (research C2) — NOT the other six root-inheritors (user /
   * organization / account / space / virtual-contributor /
   * virtual-assistant), which `global-support` reaches only via the ROOT
   * cascade above, not this one. */
  readonly globalSupportPlatformSubtree: {
    readonly credential: AuthorizationCredential;
    readonly privileges: readonly AuthorizationPrivilege[];
    readonly trees: readonly TreeId[];
  };
} = {
  globalAdminRootCrud: {
    credential: AuthorizationCredential.GLOBAL_ADMIN,
    privileges: [
      AuthorizationPrivilege.CREATE,
      AuthorizationPrivilege.READ,
      AuthorizationPrivilege.UPDATE,
      AuthorizationPrivilege.DELETE,
      AuthorizationPrivilege.GRANT,
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
  },
  globalSupportPlatformSubtree: {
    credential: AuthorizationCredential.GLOBAL_SUPPORT,
    privileges: [
      AuthorizationPrivilege.CREATE,
      AuthorizationPrivilege.READ,
      AuthorizationPrivilege.UPDATE,
      AuthorizationPrivilege.DELETE,
    ],
    trees: [
      'platform',
      'forum',
      'library',
      'templates-manager',
      'role-set',
      'storage',
      'messaging',
    ],
  },
};
