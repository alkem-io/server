/**
 * Integration tests: flow-state-layout authorization
 * (feature 021-flow-state-post-layout, FR-003/FR-007, intake ruling Q1)
 *
 * Pin the two authorization contracts at the TestingModule level:
 *
 *   (a) Public-read cascade: on a PUBLIC-privacy space, the READ privilege
 *       cascades to the innovation flow and its states (including their
 *       `settings` scalar fields). We drive SpaceAuthorizationService through a
 *       real TestingModule and verify that createCredentialRule is called with
 *       [READ] and that the returned rule has cascade:true — exactly the
 *       assertion that would fail if someone removed `rule.cascade = true` from
 *       space.service.authorization.ts:599.
 *
 *   (b) Write guard: `updateInnovationFlowState` requires UPDATE on the
 *       state's authorization policy. We drive InnovationFlowResolverMutations
 *       directly and assert (i) grantAccessOrFail is invoked with UPDATE, and
 *       (ii) when grantAccessOrFail throws (actor lacks UPDATE), the mutation
 *       rejects — confirming the new descriptionDisplayMode / showPublishDetails
 *       fields are blocked for non-admins.
 *
 *   (c) InnovationFlowStateAuthorizationService inherits the parent (flow)
 *       authorization, which carries the cascade chain from the space — so the
 *       public-read rule propagates all the way to the state.
 *
 * The LIVE anonymous GraphQL probe (FR-007, contract §5) is owned by the
 * forge verification phase (gql-live track, repos.yaml) — not duplicated here.
 *
 * No real DB or HTTP server is used. All interactions are exercised through
 * NestJS TestingModule with mocked dependencies, following the same pattern
 * used by innovation.flow.resolver.mutations.spec.ts and
 * space.service.authorization.spec.ts.
 */

import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { CommunityMembershipPolicy } from '@common/enums/community.membership.policy';
import { RoleName } from '@common/enums/role.name';
import { SpaceLevel } from '@common/enums/space.level';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { SpaceSortMode } from '@common/enums/space.sort.mode';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformRolesAccessService } from '@domain/access/platform-roles-access/platform.roles.access.service';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { CollaborationAuthorizationService } from '@domain/collaboration/collaboration/collaboration.service.authorization';
import { InnovationFlowResolverMutations } from '@domain/collaboration/innovation-flow/innovation.flow.resolver.mutations';
import { InnovationFlowService } from '@domain/collaboration/innovation-flow/innovation.flow.service';
import { InnovationFlowStateService } from '@domain/collaboration/innovation-flow-state/innovation.flow.state.service';
import { InnovationFlowStateAuthorizationService } from '@domain/collaboration/innovation-flow-state/innovation.flow.state.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicenseAuthorizationService } from '@domain/common/license/license.service.authorization';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { CommunityAuthorizationService } from '@domain/community/community/community.service.authorization';
import { SpaceAuthorizationService } from '@domain/space/space/space.service.authorization';
import { SpaceAboutAuthorizationService } from '@domain/space/space.about/space.about.service.authorization';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { StorageAggregatorAuthorizationService } from '@domain/storage/storage-aggregator/storage.aggregator.service.authorization';
import { TemplatesManagerAuthorizationService } from '@domain/template/templates-manager/templates.manager.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';

// ---------------------------------------------------------------------------
// (a) Public-read cascade: PUBLIC space → createCredentialRule called with
//     [READ] and the returned rule has cascade:true set by the production code
//     in space.service.authorization.ts:594-599 (extendAuthorizationPolicyLocal).
// ---------------------------------------------------------------------------

describe('flow-state-layout — public-read cascade contract (FR-007, intake Q1)', () => {
  let module: TestingModule;
  let spaceAuthorizationService: SpaceAuthorizationService;
  let spaceLookupService: SpaceLookupService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let platformRolesAccessService: PlatformRolesAccessService;
  let communityAuthorizationService: CommunityAuthorizationService;
  let collaborationAuthorizationService: CollaborationAuthorizationService;
  let storageAggregatorAuthorizationService: StorageAggregatorAuthorizationService;
  let spaceAboutAuthorizationService: SpaceAboutAuthorizationService;
  let profileAuthorizationService: ProfileAuthorizationService;
  let licenseAuthorizationService: LicenseAuthorizationService;
  let templatesManagerAuthorizationService: TemplatesManagerAuthorizationService;

  const defaultSettings = {
    privacy: {
      mode: SpacePrivacyMode.PUBLIC,
      allowPlatformSupportAsAdmin: false,
    },
    membership: {
      policy: CommunityMembershipPolicy.OPEN,
      trustedOrganizations: [],
      allowSubspaceAdminsToInviteMembers: false,
    },
    collaboration: {
      inheritMembershipRights: true,
      allowMembersToCreateSubspaces: true,
      allowMembersToCreateCallouts: true,
      allowEventsFromSubspaces: true,
      allowMembersToVideoCall: false,
      allowGuestContributions: false,
    },
    sortMode: SpaceSortMode.ALPHABETICAL,
  };

  const createMockSpace = (
    privacyMode: SpacePrivacyMode = SpacePrivacyMode.PUBLIC
  ) => ({
    id: 'space-1',
    level: SpaceLevel.L0,
    visibility: SpaceVisibility.ACTIVE,
    settings: {
      ...defaultSettings,
      privacy: { ...defaultSettings.privacy, mode: privacyMode },
    },
    authorization: {
      id: 'auth-1',
      credentialRules: [],
      privilegeRules: [],
      type: AuthorizationPolicyType.SPACE,
      parentAuthorizationPolicy: undefined,
    },
    community: { id: 'community-1', roleSet: { id: 'roleset-1' } },
    collaboration: { id: 'collab-1' },
    about: { id: 'about-1', profile: { id: 'profile-1' } },
    profile: { id: 'space-profile-1' },
    storageAggregator: { id: 'storage-1' },
    templatesManager: { id: 'templates-1' },
    subspaces: [],
    license: { id: 'license-1' },
    account: { id: 'account-1' },
    platformRolesAccess: {
      roles: [
        {
          roleName: RoleName.MEMBER,
          grantedPrivileges: [AuthorizationPrivilege.READ],
        },
      ],
    },
  });

  beforeEach(async () => {
    vi.restoreAllMocks();

    module = await Test.createTestingModule({
      providers: [SpaceAuthorizationService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    spaceAuthorizationService = module.get(SpaceAuthorizationService);
    spaceLookupService = module.get(SpaceLookupService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    platformRolesAccessService = module.get(PlatformRolesAccessService);
    communityAuthorizationService = module.get(CommunityAuthorizationService);
    collaborationAuthorizationService = module.get(
      CollaborationAuthorizationService
    );
    storageAggregatorAuthorizationService = module.get(
      StorageAggregatorAuthorizationService
    );
    spaceAboutAuthorizationService = module.get(SpaceAboutAuthorizationService);
    profileAuthorizationService = module.get(ProfileAuthorizationService);
    licenseAuthorizationService = module.get(LicenseAuthorizationService);
    templatesManagerAuthorizationService = module.get(
      TemplatesManagerAuthorizationService
    );

    // Base mocks shared between tests — each test may override specific mocks
    (
      profileAuthorizationService.applyAuthorizationPolicy as any
    ).mockResolvedValue([]);
    (
      communityAuthorizationService.applyAuthorizationPolicy as any
    ).mockResolvedValue([]);
    (
      storageAggregatorAuthorizationService.applyAuthorizationPolicy as any
    ).mockResolvedValue([]);
    (
      collaborationAuthorizationService.applyAuthorizationPolicy as any
    ).mockResolvedValue([]);
    (
      licenseAuthorizationService.applyAuthorizationPolicy as any
    ).mockReturnValue([]);
    (
      templatesManagerAuthorizationService.applyAuthorizationPolicy as any
    ).mockResolvedValue([]);
    (
      spaceAboutAuthorizationService.applyAuthorizationPolicy as any
    ).mockResolvedValue([]);
    (authorizationPolicyService.saveAll as any).mockResolvedValue([]);
    (
      authorizationPolicyService.appendPrivilegeAuthorizationRuleMapping as any
    ).mockImplementation((auth: any) => auth);
    (
      authorizationPolicyService.appendCredentialAuthorizationRules as any
    ).mockImplementation((auth: any) => auth);
    (platformRolesAccessService.getPrivilegesForRole as any).mockReturnValue(
      []
    );
    (authorizationPolicyService.reset as any).mockImplementation(
      (auth: any) => auth
    );
    (
      authorizationPolicyService.inheritParentAuthorization as any
    ).mockImplementation((auth: any) => auth);
    (authorizationPolicyService.save as any).mockImplementation(
      async (auth: any) => auth
    );
    (
      authorizationPolicyService.createCredentialRuleUsingTypesOnly as any
    ).mockReturnValue({
      cascade: false,
    });
  });

  afterEach(() => module.close());

  it('PUBLIC space: createCredentialRule is called with [READ] and the rule has cascade:true — regression for space.service.authorization.ts:594-599', async () => {
    // This test will FAIL if someone removes `rule.cascade = true` from
    // extendAuthorizationPolicyLocal or changes the privilege from READ to
    // READ_ABOUT for the PUBLIC branch — the exact regression FR-007 guards against.
    const mockSpace = createMockSpace(SpacePrivacyMode.PUBLIC);

    (spaceLookupService.getSpaceOrFail as any).mockResolvedValue(mockSpace);
    (
      platformRolesAccessService.getCredentialsForRolesWithAccess as any
    ).mockReturnValue([
      { type: AuthorizationCredential.GLOBAL_ADMIN, resourceID: '' },
    ]);
    RoleSetService.prototype as any;
    (module.get(RoleSetService).getCredentialsForRole as any).mockResolvedValue(
      []
    );
    (
      module.get(RoleSetService).getCredentialsForRoleWithParents as any
    ).mockResolvedValue([]);
    (
      module.get(RoleSetService).getDirectParentCredentialForRole as any
    ).mockResolvedValue(undefined);

    // Track the rule returned from createCredentialRule so we can observe
    // whether production code sets cascade:true on it.
    const capturedRules: any[] = [];
    (authorizationPolicyService.createCredentialRule as any).mockImplementation(
      (grantedPrivileges: any, criterias: any, _name: any) => {
        const rule = { grantedPrivileges, criterias, cascade: false };
        capturedRules.push(rule);
        return rule;
      }
    );

    await spaceAuthorizationService.applyAuthorizationPolicy('space-1');

    // extendAuthorizationPolicyLocal calls createCredentialRule for the PUBLIC branch
    // with [AuthorizationPrivilege.READ] and then sets cascade:true on the returned rule.
    const readRule = capturedRules.find(
      r =>
        Array.isArray(r.grantedPrivileges) &&
        r.grantedPrivileges.includes(AuthorizationPrivilege.READ) &&
        !r.grantedPrivileges.includes(AuthorizationPrivilege.READ_ABOUT)
    );

    expect(readRule).toBeDefined();
    // The production code at line 599 sets rule.cascade = true on this exact object
    expect(readRule!.cascade).toBe(true);
  });

  it('PRIVATE space: createCredentialRule is called with [READ_ABOUT] and cascade:false — anonymous access blocked', async () => {
    // Symmetrical regression guard: if PUBLIC accidentally degrades to READ_ABOUT,
    // or if PRIVATE accidentally gains cascade:true, one of these two tests fails.
    const mockSpace = createMockSpace(SpacePrivacyMode.PRIVATE);

    (spaceLookupService.getSpaceOrFail as any).mockResolvedValue(mockSpace);
    (
      platformRolesAccessService.getCredentialsForRolesWithAccess as any
    ).mockReturnValue([
      { type: AuthorizationCredential.GLOBAL_ADMIN, resourceID: '' },
    ]);
    (module.get(RoleSetService).getCredentialsForRole as any).mockResolvedValue(
      []
    );
    (
      module.get(RoleSetService).getCredentialsForRoleWithParents as any
    ).mockResolvedValue([]);
    (
      module.get(RoleSetService).getDirectParentCredentialForRole as any
    ).mockResolvedValue(undefined);

    const capturedRules: any[] = [];
    (authorizationPolicyService.createCredentialRule as any).mockImplementation(
      (grantedPrivileges: any, criterias: any, _name: any) => {
        const rule = { grantedPrivileges, criterias, cascade: true };
        capturedRules.push(rule);
        return rule;
      }
    );

    await spaceAuthorizationService.applyAuthorizationPolicy('space-1');

    // PRIVATE branch calls createCredentialRule with [READ_ABOUT] and sets cascade:false
    const readAboutRule = capturedRules.find(
      r =>
        Array.isArray(r.grantedPrivileges) &&
        r.grantedPrivileges.includes(AuthorizationPrivilege.READ_ABOUT)
    );

    expect(readAboutRule).toBeDefined();
    // Production code at line 609 sets rule.cascade = false for PRIVATE
    expect(readAboutRule!.cascade).toBe(false);
    // READ is NOT granted — only READ_ABOUT
    expect(readAboutRule!.grantedPrivileges).not.toContain(
      AuthorizationPrivilege.READ
    );
  });

  it('InnovationFlowStateAuthorizationService inherits parent authorization via inheritParentAuthorization (cascade propagates)', async () => {
    // States call inheritParentAuthorization(stateAuth, flowAuth) where flowAuth
    // already carries the cascaded PUBLIC READ rule from the space. This test pins
    // that the state auth service uses inheritance (not a fresh policy), preserving
    // the cascade chain.

    const stateModule = await Test.createTestingModule({
      providers: [
        InnovationFlowStateAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    const stateAuthService = stateModule.get(
      InnovationFlowStateAuthorizationService
    );
    const policyService = stateModule.get(AuthorizationPolicyService);

    const stateAuth = { id: 'state-auth' } as any;
    const flowAuth = {
      id: 'flow-auth',
      credentialRules: [
        { cascade: true, grantedPrivileges: [AuthorizationPrivilege.READ] },
      ],
    } as any;

    const resetAuth = { id: 'reset-auth' } as any;
    const inheritedAuth = {
      id: 'inherited-auth',
      credentialRules: flowAuth.credentialRules,
    } as any;

    vi.mocked(policyService.reset).mockReturnValue(resetAuth);
    vi.mocked(policyService.inheritParentAuthorization).mockReturnValue(
      inheritedAuth
    );

    const result = stateAuthService.applyAuthorizationPolicy(
      { id: 'state-1', authorization: stateAuth } as any,
      flowAuth
    );

    expect(policyService.inheritParentAuthorization).toHaveBeenCalledWith(
      resetAuth,
      flowAuth
    );
    expect(result).toBe(inheritedAuth);
    // NOTE: deliberately NOT asserting on result.credentialRules here. `inheritParentAuthorization`
    // is mocked, so those rules are this test's own fixture — asserting `cascade === true` on them
    // would check the literal declared above against itself and could never fail. What this test
    // can honestly prove is the delegation: reset(state) → inheritParentAuthorization(reset, flow).
    // That the cascade actually REACHES a flow state is a live-stack property (FR-007), not a
    // mockable one.

    await stateModule.close();
  });
});

// ---------------------------------------------------------------------------
// (b) Write guard: settings update requires UPDATE privilege (FR-003)
//     Drive InnovationFlowResolverMutations directly so that
//     grantAccessOrFail is asserted against the state's authorization with
//     AuthorizationPrivilege.UPDATE — mirroring the pattern in
//     innovation.flow.resolver.mutations.spec.ts:192-238.
// ---------------------------------------------------------------------------

describe('flow-state-layout — write guard: UPDATE privilege required for settings changes (FR-003)', () => {
  let resolver: InnovationFlowResolverMutations;
  let innovationFlowStateService: InnovationFlowStateService;
  let innovationFlowService: InnovationFlowService;
  let authorizationService: AuthorizationService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InnovationFlowResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(InnovationFlowResolverMutations);
    innovationFlowStateService = module.get(InnovationFlowStateService);
    innovationFlowService = module.get(InnovationFlowService);
    authorizationService = module.get(AuthorizationService);
  });

  it('updateInnovationFlowState: grantAccessOrFail is called with UPDATE on the state authorization (admin path)', async () => {
    // The new descriptionDisplayMode and showPublishDetails fields are updated
    // via the existing updateInnovationFlowState mutation, which gates on
    // UPDATE against the state's own authorization — not the flow's.
    // This test will fail if the privilege gate is weakened (e.g. changed to
    // READ or removed) or if the gate moves to a different authorization object.

    const stateAuth = { id: 'state-auth', type: 'INNOVATION_FLOW_STATE' };
    const flowState = {
      id: 'state-1',
      authorization: stateAuth,
      innovationFlow: { id: 'flow-1' },
    } as any;
    const updatedState = {
      id: 'state-1',
      displayName: 'Updated',
      settings: {
        descriptionDisplayMode: 'COLLAPSED',
        showPublishDetails: false,
      },
    } as any;

    vi.mocked(
      innovationFlowStateService.getInnovationFlowStateOrFail
    ).mockResolvedValue(flowState);
    vi.mocked(
      innovationFlowService.updateInnovationFlowState
    ).mockResolvedValue(updatedState);

    const actorContext = { actorID: 'admin-user' } as any;

    const result = await resolver.updateInnovationFlowState(actorContext, {
      innovationFlowStateID: 'state-1',
      settings: {
        descriptionDisplayMode: 'COLLAPSED',
        showPublishDetails: false,
      },
    } as any);

    // The resolver MUST call grantAccessOrFail with UPDATE on the state's auth
    expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
      actorContext,
      stateAuth,
      AuthorizationPrivilege.UPDATE,
      expect.any(String)
    );
    expect(result).toBe(updatedState);
  });

  it('updateInnovationFlowState: non-admin actor is denied when grantAccessOrFail throws (FR-003)', async () => {
    // When a non-admin calls updateInnovationFlowState (including updates to the
    // new descriptionDisplayMode / showPublishDetails fields), the UPDATE privilege
    // check must throw and the mutation must not proceed.
    //
    // This test will fail if the grantAccessOrFail call is removed or bypassed,
    // letting unauthorized updates through.

    const stateAuth = { id: 'state-auth', type: 'INNOVATION_FLOW_STATE' };
    const flowState = {
      id: 'state-1',
      authorization: stateAuth,
      innovationFlow: { id: 'flow-1' },
    } as any;

    vi.mocked(
      innovationFlowStateService.getInnovationFlowStateOrFail
    ).mockResolvedValue(flowState);

    // Simulate what AuthorizationService throws when privilege is denied
    vi.mocked(authorizationService.grantAccessOrFail).mockImplementation(() => {
      throw new ForbiddenAuthorizationPolicyException(
        'not allowed',
        AuthorizationPrivilege.UPDATE,
        stateAuth.id,
        'non-admin-user'
      );
    });

    const actorContext = { actorID: 'non-admin-user' } as any;

    await expect(
      resolver.updateInnovationFlowState(actorContext, {
        innovationFlowStateID: 'state-1',
        settings: { descriptionDisplayMode: 'COLLAPSED' },
      } as any)
    ).rejects.toBeInstanceOf(ForbiddenAuthorizationPolicyException);

    // The update service must NOT have been called after a denied gate
    expect(
      innovationFlowService.updateInnovationFlowState
    ).not.toHaveBeenCalled();
  });
});
