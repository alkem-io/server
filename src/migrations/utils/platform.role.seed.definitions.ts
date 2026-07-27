/**
 * 027-platform-role-redesign — the single source for the twelve target
 * `Platform …` / `Feature …` role rows (data-model.md §2), shared by:
 *  - the fresh-bootstrap seed migration (`1764590884533-seed.ts`, T012)
 *  - the idempotent existing-install migration (`AddPlatformRolesRedesign`, T013)
 *  - the FR-011 anti-drift spec (`role.credential.map.spec.ts`, T011)
 *
 * Each `name` and `credential.type` are the SAME string (research D2) and
 * MUST equal the corresponding `RoleName` / `AuthorizationCredential` member
 * value — the anti-drift spec asserts this three-way equality.
 *
 * Actor-policy triples per data-model.md §2:
 *  - the 9 `platform-*` rows: `organizationPolicy {0,0}` — FR-002's holder-kind
 *    rule (users/service accounts only), enforced a second time at the data layer.
 *  - the 3 `feature-*` rows: `organizationPolicy {minimum:0, maximum:-1}` —
 *    feature roles may be held by an organization.
 *  - `platform-roles-admin` alone: `userPolicy {minimum:1, maximum:-1}` (FR-013a)
 *    — the platform must always retain at least one, mirroring the mechanism
 *    `global-admin`'s row already uses.
 *  - `virtualContributorPolicy {0,0}` throughout — none of the 12 is
 *    VC-holdable.
 *
 * Do NOT inherit `{minimum:0, maximum:0}` for `organizationPolicy` on the
 * `feature-*` rows — that is the defect T012 exists to avoid: it would make
 * FR-002's organization half unreachable no matter what the assignment rule
 * engine does.
 */
export interface PlatformRoleActorPolicy {
  minimum: number;
  maximum: number;
}

export interface PlatformRoleSeedDefinition {
  name: string;
  credentialType: string;
  userPolicy: PlatformRoleActorPolicy;
  organizationPolicy: PlatformRoleActorPolicy;
  virtualContributorPolicy: PlatformRoleActorPolicy;
}

const PLATFORM_HOLDER_KIND_ORG_POLICY: PlatformRoleActorPolicy = {
  minimum: 0,
  maximum: 0,
};
const FEATURE_HOLDER_KIND_ORG_POLICY: PlatformRoleActorPolicy = {
  minimum: 0,
  maximum: -1,
};
const NO_VC_POLICY: PlatformRoleActorPolicy = { minimum: 0, maximum: 0 };
const ORDINARY_USER_POLICY: PlatformRoleActorPolicy = {
  minimum: 0,
  maximum: -1,
};
const BREAK_GLASS_USER_POLICY: PlatformRoleActorPolicy = {
  minimum: 1,
  maximum: -1,
};

/**
 * The pre-existing (legacy) role rows, unchanged in value — extracted from
 * `createPlatformRoles()`'s original hardcoded array so both the seed
 * migration and `role.credential.map.spec.ts` (T011) read the same list.
 * Slice B (T081) removes these from the fresh-bootstrap list; Slice A keeps
 * them untouched (additive, FR-007's `{owning role} ∪ legacy` rule).
 */
export const LEGACY_PLATFORM_ROLE_SEED_DEFINITIONS: PlatformRoleSeedDefinition[] =
  [
    {
      name: 'global-admin',
      credentialType: 'global-admin',
      userPolicy: { minimum: 1, maximum: -1 },
      organizationPolicy: PLATFORM_HOLDER_KIND_ORG_POLICY,
      virtualContributorPolicy: NO_VC_POLICY,
    },
    {
      name: 'global-support',
      credentialType: 'global-support',
      userPolicy: ORDINARY_USER_POLICY,
      organizationPolicy: PLATFORM_HOLDER_KIND_ORG_POLICY,
      virtualContributorPolicy: NO_VC_POLICY,
    },
    {
      name: 'global-license-manager',
      credentialType: 'global-license-manager',
      userPolicy: ORDINARY_USER_POLICY,
      organizationPolicy: PLATFORM_HOLDER_KIND_ORG_POLICY,
      virtualContributorPolicy: NO_VC_POLICY,
    },
    {
      // C1 silent-void defect (research): the seeded credential.type
      // 'global-spaces-reader' does NOT match AuthorizationCredential
      // .GLOBAL_SPACES_READER's value 'global-spaces-read'. Left exactly as
      // seeded today — this feature's fix is structural (T009/T010: the
      // canonical map resolves the CORRECT type regardless of what a stored
      // row carries), not a repair migration (T069, D1: no repair ships).
      name: 'global-spaces-reader',
      credentialType: 'global-spaces-reader',
      userPolicy: ORDINARY_USER_POLICY,
      organizationPolicy: PLATFORM_HOLDER_KIND_ORG_POLICY,
      virtualContributorPolicy: NO_VC_POLICY,
    },
    {
      name: 'platform-beta-tester',
      credentialType: 'beta-tester',
      userPolicy: ORDINARY_USER_POLICY,
      organizationPolicy: PLATFORM_HOLDER_KIND_ORG_POLICY,
      virtualContributorPolicy: NO_VC_POLICY,
    },
    {
      name: 'platform-vc-campaign',
      credentialType: 'vc-campaign',
      userPolicy: ORDINARY_USER_POLICY,
      organizationPolicy: PLATFORM_HOLDER_KIND_ORG_POLICY,
      virtualContributorPolicy: NO_VC_POLICY,
    },
    {
      name: 'platform-assistant-access',
      credentialType: 'assistant-access',
      userPolicy: ORDINARY_USER_POLICY,
      organizationPolicy: PLATFORM_HOLDER_KIND_ORG_POLICY,
      virtualContributorPolicy: NO_VC_POLICY,
    },
    {
      // C1 silent-void defect: seeded 'global-community-reader' vs
      // AuthorizationCredential.GLOBAL_COMMUNITY_READ's 'global-community-read'.
      // See the note on 'global-spaces-reader' above — same fix, same reason.
      name: 'global-community-reader',
      credentialType: 'global-community-reader',
      userPolicy: ORDINARY_USER_POLICY,
      organizationPolicy: PLATFORM_HOLDER_KIND_ORG_POLICY,
      virtualContributorPolicy: NO_VC_POLICY,
    },
    {
      name: 'registered',
      credentialType: 'global-registered',
      userPolicy: ORDINARY_USER_POLICY,
      organizationPolicy: PLATFORM_HOLDER_KIND_ORG_POLICY,
      virtualContributorPolicy: NO_VC_POLICY,
    },
    {
      name: 'global-platform-manager',
      credentialType: 'global-platform-manager',
      userPolicy: ORDINARY_USER_POLICY,
      organizationPolicy: PLATFORM_HOLDER_KIND_ORG_POLICY,
      virtualContributorPolicy: NO_VC_POLICY,
    },
    {
      name: 'global-support-manager',
      credentialType: 'global-support-manager',
      userPolicy: ORDINARY_USER_POLICY,
      organizationPolicy: PLATFORM_HOLDER_KIND_ORG_POLICY,
      virtualContributorPolicy: NO_VC_POLICY,
    },
    {
      name: 'platform-operations-admin',
      credentialType: 'platform-operations-admin',
      userPolicy: ORDINARY_USER_POLICY,
      organizationPolicy: PLATFORM_HOLDER_KIND_ORG_POLICY,
      virtualContributorPolicy: NO_VC_POLICY,
    },
  ];

export const NEW_PLATFORM_ROLE_SEED_DEFINITIONS: PlatformRoleSeedDefinition[] =
  [
    {
      name: 'platform-roles-admin',
      credentialType: 'platform-roles-admin',
      userPolicy: BREAK_GLASS_USER_POLICY,
      organizationPolicy: PLATFORM_HOLDER_KIND_ORG_POLICY,
      virtualContributorPolicy: NO_VC_POLICY,
    },
    {
      name: 'platform-content-full-access',
      credentialType: 'platform-content-full-access',
      userPolicy: ORDINARY_USER_POLICY,
      organizationPolicy: PLATFORM_HOLDER_KIND_ORG_POLICY,
      virtualContributorPolicy: NO_VC_POLICY,
    },
    {
      name: 'platform-resource-admin',
      credentialType: 'platform-resource-admin',
      userPolicy: ORDINARY_USER_POLICY,
      organizationPolicy: PLATFORM_HOLDER_KIND_ORG_POLICY,
      virtualContributorPolicy: NO_VC_POLICY,
    },
    {
      name: 'platform-settings-admin',
      credentialType: 'platform-settings-admin',
      userPolicy: ORDINARY_USER_POLICY,
      organizationPolicy: PLATFORM_HOLDER_KIND_ORG_POLICY,
      virtualContributorPolicy: NO_VC_POLICY,
    },
    {
      name: 'platform-users-admin',
      credentialType: 'platform-users-admin',
      userPolicy: ORDINARY_USER_POLICY,
      organizationPolicy: PLATFORM_HOLDER_KIND_ORG_POLICY,
      virtualContributorPolicy: NO_VC_POLICY,
    },
    {
      name: 'platform-support',
      credentialType: 'platform-support',
      userPolicy: ORDINARY_USER_POLICY,
      organizationPolicy: PLATFORM_HOLDER_KIND_ORG_POLICY,
      virtualContributorPolicy: NO_VC_POLICY,
    },
    {
      name: 'platform-license-manager',
      credentialType: 'platform-license-manager',
      userPolicy: ORDINARY_USER_POLICY,
      organizationPolicy: PLATFORM_HOLDER_KIND_ORG_POLICY,
      virtualContributorPolicy: NO_VC_POLICY,
    },
    {
      name: 'platform-spaces-reader',
      credentialType: 'platform-spaces-reader',
      userPolicy: ORDINARY_USER_POLICY,
      organizationPolicy: PLATFORM_HOLDER_KIND_ORG_POLICY,
      virtualContributorPolicy: NO_VC_POLICY,
    },
    {
      name: 'platform-audit-reader',
      credentialType: 'platform-audit-reader',
      userPolicy: ORDINARY_USER_POLICY,
      organizationPolicy: PLATFORM_HOLDER_KIND_ORG_POLICY,
      virtualContributorPolicy: NO_VC_POLICY,
    },
    {
      name: 'feature-beta-tester',
      credentialType: 'feature-beta-tester',
      userPolicy: ORDINARY_USER_POLICY,
      organizationPolicy: FEATURE_HOLDER_KIND_ORG_POLICY,
      virtualContributorPolicy: NO_VC_POLICY,
    },
    {
      name: 'feature-virtual-assistant',
      credentialType: 'feature-virtual-assistant',
      userPolicy: ORDINARY_USER_POLICY,
      organizationPolicy: FEATURE_HOLDER_KIND_ORG_POLICY,
      virtualContributorPolicy: NO_VC_POLICY,
    },
    {
      name: 'feature-organization-creator',
      credentialType: 'feature-organization-creator',
      userPolicy: ORDINARY_USER_POLICY,
      organizationPolicy: FEATURE_HOLDER_KIND_ORG_POLICY,
      virtualContributorPolicy: NO_VC_POLICY,
    },
  ];
