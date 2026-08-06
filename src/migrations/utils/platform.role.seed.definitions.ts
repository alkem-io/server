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
 * The role rows that pre-date this feature AND survive it (T081, Slice B).
 *
 * Two remain of the original twelve:
 *  - `registered` — the baseline non-admin tier. Not part of the decomposed
 *    admin vocabulary and never was.
 *  - `platform-operations-admin` — spec 032's role, already single-purpose;
 *    027 changes its grant sets, not its existence.
 *
 * The other ten went with T077's enum removals, and the
 * `1785000000005-DropLegacyPlatformRoles` migration deletes their stored rows
 * (and every credential naming them) on existing installs. A fresh bootstrap
 * therefore never creates them — which is the whole of T081.
 *
 * Both C1 defect rows (`global-spaces-reader` and `global-community-reader`,
 * whose stored `credentialType` matched no `AuthorizationCredential` member)
 * were in the deleted ten, so the silent void is closed by removal rather than
 * by repair — research D1's decision, now executed.
 */
export const BASELINE_PLATFORM_ROLE_SEED_DEFINITIONS: PlatformRoleSeedDefinition[] =
  [
    {
      name: 'registered',
      credentialType: 'global-registered',
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
