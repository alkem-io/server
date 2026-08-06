import { SUBSCRIPTION_SUBSPACE_CREATED } from '@common/constants/providers';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { SubscriptionType } from '@common/enums/subscription.type';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicenseService } from '@domain/common/license/license.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { PlatformResourceAuditService } from '@src/platform-admin/platform-resource-audit/platform.resource.audit.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { type Mock } from 'vitest';
import { SpaceResolverMutations } from './space.resolver.mutations';
import { SpaceService } from './space.service';
import { SpaceAuthorizationService } from './space.service.authorization';
import { SpaceLicenseService } from './space.service.license';

describe('SpaceResolverMutations', () => {
  let module: TestingModule;
  let resolver: SpaceResolverMutations;
  let spaceService: SpaceService;
  let authorizationService: AuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let spaceAuthorizationService: SpaceAuthorizationService;
  let spaceLicenseService: SpaceLicenseService;
  let licenseService: LicenseService;
  let activityAdapter: ActivityAdapter;
  let contributionReporter: ContributionReporterService;
  let subspaceCreatedSubscription: any;

  beforeEach(async () => {
    vi.restoreAllMocks();

    subspaceCreatedSubscription = { publish: vi.fn() };

    module = await Test.createTestingModule({
      providers: [
        SpaceResolverMutations,
        MockWinstonProvider,
        {
          provide: SUBSCRIPTION_SUBSPACE_CREATED,
          useValue: subspaceCreatedSubscription,
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(SpaceResolverMutations);
    spaceService = module.get(SpaceService);
    authorizationService = module.get(AuthorizationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    spaceAuthorizationService = module.get(SpaceAuthorizationService);
    spaceLicenseService = module.get(SpaceLicenseService);
    licenseService = module.get(LicenseService);
    activityAdapter = module.get(ActivityAdapter);
    contributionReporter = module.get(ContributionReporterService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('updateSpace', () => {
    it('should authorize, update, and report contribution', async () => {
      const actorContext = { actorID: 'actor-1' } as any;
      const spaceData = { ID: 'space-1' } as any;
      const space = {
        id: 'space-1',
        authorization: { id: 'auth-1' },
        about: { profile: { displayName: 'Test Space' } },
      } as any;

      vi.mocked(spaceService.getSpaceOrFail).mockResolvedValue(space);
      vi.mocked(authorizationService.grantAccessOrFail).mockReturnValue(
        undefined as any
      );
      vi.mocked(spaceService.update).mockResolvedValue(space);

      const result = await resolver.updateSpace(actorContext, spaceData);

      expect(result).toBe(space);
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        space.authorization,
        AuthorizationPrivilege.UPDATE,
        expect.any(String)
      );
      expect(contributionReporter.spaceContentEdited).toHaveBeenCalled();
    });
  });

  describe('deleteSpace', () => {
    it('should authorize and delete space', async () => {
      const actorContext = { actorID: 'actor-1' } as any;
      const deleteData = { ID: 'space-1' } as any;
      const space = {
        id: 'space-1',
        nameID: 'test-space',
        authorization: { id: 'auth-1' },
      } as any;

      vi.mocked(spaceService.getSpaceOrFail).mockResolvedValue(space);
      // 027-platform-role-redesign (T043): the dual-path check calls
      // isAccessGranted before falling through to grantAccessOrFail.
      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(false);
      vi.mocked(authorizationService.grantAccessOrFail).mockReturnValue(
        undefined as any
      );
      vi.mocked(spaceService.deleteSpaceOrFail).mockResolvedValue(space);

      const result = await resolver.deleteSpace(actorContext, deleteData);

      expect(result).toBe(space);
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        space.authorization,
        AuthorizationPrivilege.DELETE,
        expect.any(String)
      );
    });
  });

  describe('updateSpaceSettings', () => {
    it('should update settings without authorization reset when not needed', async () => {
      const actorContext = { actorID: 'actor-1' } as any;
      const settingsData = {
        spaceID: 'space-1',
        settings: { collaboration: { allowEventsFromSubspaces: true } },
      } as any;
      const space = {
        id: 'space-1',
        authorization: { id: 'auth-1' },
      } as any;

      vi.mocked(spaceService.getSpaceOrFail).mockResolvedValue(space);
      vi.mocked(authorizationService.grantAccessOrFail).mockReturnValue(
        undefined as any
      );
      vi.mocked(spaceService.shouldUpdateAuthorizationPolicy).mockResolvedValue(
        false
      );
      vi.mocked(spaceService.updateSettings).mockResolvedValue(space);

      await resolver.updateSpaceSettings(actorContext, settingsData);

      expect(
        spaceAuthorizationService.applyAuthorizationPolicy
      ).not.toHaveBeenCalled();
    });

    it('should update settings with authorization reset when needed', async () => {
      const actorContext = { actorID: 'actor-1' } as any;
      const settingsData = {
        spaceID: 'space-1',
        settings: { privacy: { mode: 'private' } },
      } as any;
      const space = {
        id: 'space-1',
        authorization: { id: 'auth-1' },
      } as any;

      vi.mocked(spaceService.getSpaceOrFail).mockResolvedValue(space);
      vi.mocked(authorizationService.grantAccessOrFail).mockReturnValue(
        undefined as any
      );
      vi.mocked(spaceService.shouldUpdateAuthorizationPolicy).mockResolvedValue(
        true
      );
      vi.mocked(spaceService.updateSettings).mockResolvedValue(space);
      vi.mocked(
        spaceAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);
      vi.mocked(authorizationPolicyService.saveAll).mockResolvedValue(
        undefined as any
      );

      await resolver.updateSpaceSettings(actorContext, settingsData);

      expect(
        spaceAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith(space.id);
    });
  });

  describe('adminUpdateSpaceVisibility (T078, A14)', () => {
    it('checks ACCOUNT_LICENSE_MANAGE once — the second, nameID-only check is gone with the field', async () => {
      const actorContext = { actorID: 'actor-1' } as any;
      const updateData = { spaceID: 'space-1', visibility: 'public' } as any;
      const space = {
        id: 'space-1',
        authorization: { id: 'auth-1' },
        about: { profile: { displayName: 'Test' } },
      } as any;

      vi.mocked(spaceService.getSpaceOrFail).mockResolvedValue(space);
      vi.mocked(authorizationService.grantAccessOrFail).mockReturnValue(
        undefined as any
      );
      vi.mocked(spaceService.adminUpdateSpaceVisibility).mockResolvedValue(
        space
      );
      vi.mocked(spaceService.save).mockResolvedValue(space);
      vi.mocked(
        spaceAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);
      vi.mocked(authorizationPolicyService.saveAll).mockResolvedValue(
        undefined as any
      );

      await resolver.adminUpdateSpaceVisibility(actorContext, updateData);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        space.authorization,
        AuthorizationPrivilege.ACCOUNT_LICENSE_MANAGE,
        expect.any(String)
      );
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledTimes(1);
    });
  });

  // 027-platform-role-redesign (T078, Slice B): corr-server-6's legacy-pin
  // suite is replaced, not deleted. The pin it exercised is gone because the
  // rename left this mutation entirely — so the question worth asking with a
  // REAL AuthorizationPolicyService/AuthorizationService is now the A17
  // invariant itself: `UPDATE_NAMEID` is held by NO global credential, so a
  // rename through `updateSpace`'s protected section is denied even to
  // `global-admin`, the credential that could do it in every prior slice.
  describe('updateSpace protected nameID section — real-engine integration (T078/A17)', () => {
    let realResolver: SpaceResolverMutations;
    let realSpaceService: Record<string, Mock>;
    let realSpaceAuthorizationService: Record<string, Mock>;

    const space = {
      id: 'space-1',
      // The space's OWN policy grants ordinary UPDATE broadly — and
      // UPDATE_NAMEID to nobody, which is the point.
      authorization: (() => {
        const policy = new AuthorizationPolicy(
          AuthorizationPolicyType.SPACE
        ) as any;
        policy.credentialRules = [
          {
            grantedPrivileges: [
              AuthorizationPrivilege.UPDATE,
              AuthorizationPrivilege.ACCOUNT_LICENSE_MANAGE,
            ],
            criterias: [
              {
                type: AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS,
                resourceID: '',
              },
              {
                type: AuthorizationCredential.PLATFORM_SUPPORT,
                resourceID: '',
              },
              {
                type: AuthorizationCredential.PLATFORM_LICENSE_MANAGER,
                resourceID: '',
              },
            ],
            cascade: false,
            name: 'space-platform-settings-admin',
          },
        ];
        policy.privilegeRules = [];
        return policy;
      })(),
      about: { profile: { displayName: 'Test' } },
    };

    const buildActorContext = (
      credentialType: AuthorizationCredential
    ): any => ({
      actorID: 'actor-1',
      credentials: [{ type: credentialType, resourceID: '' }],
    });

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SpaceResolverMutations,
          AuthorizationPolicyService,
          AuthorizationService,
          MockWinstonProvider,
          repositoryProviderMockFactory(AuthorizationPolicy),
          {
            provide: SUBSCRIPTION_SUBSPACE_CREATED,
            useValue: { publish: vi.fn() },
          },
        ],
      })
        .useMocker(token => {
          if (token === ConfigService) {
            return { get: vi.fn().mockReturnValue(500) };
          }
          return defaultMockerFactory(token);
        })
        .compile();

      realResolver = module.get(SpaceResolverMutations);
      realSpaceService = module.get(SpaceService) as any;
      realSpaceAuthorizationService = module.get(
        SpaceAuthorizationService
      ) as any;

      realSpaceService.getSpaceOrFail.mockResolvedValue(space);
      realSpaceService.update.mockResolvedValue(space);
      realSpaceService.adminUpdateSpaceVisibility.mockResolvedValue(space);
      realSpaceService.save.mockResolvedValue(space);
      realSpaceAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );
    });

    it('denies a platform-license-manager-only actor the nameID rename', async () => {
      const actor = buildActorContext(
        AuthorizationCredential.PLATFORM_LICENSE_MANAGER
      );
      await expect(
        realResolver.updateSpace(actor, {
          ID: 'space-1',
          nameID: 'squatted-url',
        } as any)
      ).rejects.toThrow();
    });

    it('denies even global-admin the nameID rename — no global role holds UPDATE_NAMEID (A17)', async () => {
      const actor = buildActorContext(
        AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS
      );
      await expect(
        realResolver.updateSpace(actor, {
          ID: 'space-1',
          nameID: 'new-url',
        } as any)
      ).rejects.toThrow();
    });

    it('allows an ordinary update when nameID is absent — the protected section does not gate the rest', async () => {
      const actor = buildActorContext(
        AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS
      );
      await expect(
        realResolver.updateSpace(actor, {
          ID: 'space-1',
          about: { profile: { displayName: 'Renamed display name' } },
        } as any)
      ).resolves.toBeDefined();
    });
  });

  describe('createSubspace', () => {
    it('should create subspace, apply policies, and publish event', async () => {
      const actorContext = { actorID: 'actor-1' } as any;
      const subspaceData = { spaceID: 'space-1' } as any;
      const space = {
        id: 'space-1',
        authorization: { id: 'auth-1' },
      } as any;
      const subspace = {
        id: 'sub-1',
        levelZeroSpaceID: 'space-1',
        about: { profile: { displayName: 'Sub' } },
      } as any;
      const level0Space = {
        id: 'space-1',
        credentials: [],
      } as any;

      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(space) // first call: get parent
        .mockResolvedValueOnce(level0Space) // second: get level0 space
        .mockResolvedValueOnce(subspace) // third: final reload
        .mockResolvedValueOnce(space); // fourth: for the return
      vi.mocked(authorizationService.grantAccessOrFail).mockReturnValue(
        undefined as any
      );
      vi.mocked(spaceService.createSubspace).mockResolvedValue(subspace);
      vi.mocked(
        spaceAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);
      vi.mocked(authorizationPolicyService.saveAll).mockResolvedValue(
        undefined as any
      );
      vi.mocked(spaceLicenseService.applyLicensePolicy).mockResolvedValue([]);
      vi.mocked(licenseService.saveAll).mockResolvedValue(undefined as any);

      const _result = await resolver.createSubspace(actorContext, subspaceData);

      expect(activityAdapter.subspaceCreated).toHaveBeenCalled();
      expect(contributionReporter.subspaceCreated).toHaveBeenCalled();
      expect(subspaceCreatedSubscription.publish).toHaveBeenCalledWith(
        SubscriptionType.SUBSPACE_CREATED,
        expect.objectContaining({
          spaceID: 'space-1',
        })
      );
    });
  });

  describe('updateSubspacesSortOrder', () => {
    it('should authorize and update sort order', async () => {
      const actorContext = { actorID: 'actor-1' } as any;
      const sortOrderData = {
        spaceID: 'space-1',
        subspaceIDs: ['sub-1', 'sub-2'],
      } as any;
      const space = {
        id: 'space-1',
        authorization: { id: 'auth-1' },
      } as any;

      vi.mocked(spaceService.getSpaceOrFail).mockResolvedValue(space);
      vi.mocked(authorizationService.grantAccessOrFail).mockReturnValue(
        undefined as any
      );
      vi.mocked(spaceService.updateSubspacesSortOrder).mockResolvedValue([]);

      await resolver.updateSubspacesSortOrder(actorContext, sortOrderData);

      expect(spaceService.updateSubspacesSortOrder).toHaveBeenCalledWith(
        space,
        sortOrderData
      );
    });
  });

  describe('updateSubspacePinned', () => {
    it('should authorize and update pinned state', async () => {
      const actorContext = { actorID: 'actor-1' } as any;
      const pinnedData = {
        spaceID: 'space-1',
        subspaceID: 'sub-1',
        pinned: true,
      } as any;
      const space = {
        id: 'space-1',
        authorization: { id: 'auth-1' },
      } as any;
      const subspace = { id: 'sub-1', pinned: true } as any;

      vi.mocked(spaceService.getSpaceOrFail).mockResolvedValue(space);
      vi.mocked(authorizationService.grantAccessOrFail).mockReturnValue(
        undefined as any
      );
      vi.mocked(spaceService.updateSubspacePinned).mockResolvedValue(subspace);

      const result = await resolver.updateSubspacePinned(
        actorContext,
        pinnedData
      );

      expect(result).toBe(subspace);
      expect(spaceService.updateSubspacePinned).toHaveBeenCalledWith(
        'space-1',
        'sub-1',
        true
      );
    });
  });
  // ===================================================================
  // qual-server-12 + qual-server-13 (2026-07-31) — the same gap, seen twice.
  //
  // `deleteSpace` is an A8 DUAL-PATH surface: the space owner reaches it via
  // plain DELETE, `platform-content-full-access` via its own privilege. The
  // `deleteSpace` suite above stubs `isAccessGranted` to `false` for BOTH,
  // so only the fall-through-to-grantAccessOrFail path was ever executed —
  // the PLATFORM branch, and therefore the FR-018a audit write that hangs off
  // it, was never entered by any test (qual-server-13's "DENIED direction
  // only"; qual-server-12's unasserted `recordEventForActor`).
  //
  // These tests drive the ALLOWED direction of each branch and assert the
  // audit boundary FR-018a actually specifies: audited on the PLATFORM
  // branch, silent on the owner branch. That asymmetry is the whole point —
  // an owner deleting their own space is not an administrative act.
  // ===================================================================
  describe('A8/A14 platform-branch audit coverage (qual-server-12/qual-server-13)', () => {
    const actorContext = { actorID: 'actor-1' } as any;
    const space = {
      id: 'space-1',
      nameID: 'test-space',
      authorization: { id: 'auth-1' },
    } as any;

    /** Grant exactly one privilege, so which branch authorized the call is
     *  unambiguous — `mockReturnValue(true)` would satisfy both at once and
     *  prove nothing about the boundary. */
    const grantOnly = (privilege: AuthorizationPrivilege) =>
      vi
        .mocked(authorizationService.isAccessGranted)
        .mockImplementation(
          (_a: any, _p: any, requested: any) => requested === privilege
        );

    const resourceAudit = () => module.get(PlatformResourceAuditService) as any;

    beforeEach(() => {
      vi.mocked(spaceService.getSpaceOrFail).mockResolvedValue(space);
      vi.mocked(spaceService.deleteSpaceOrFail).mockResolvedValue(space);
      vi.mocked(authorizationService.grantAccessOrFail).mockReturnValue(
        undefined as any
      );
    });

    it('deleteSpace on the PLATFORM branch records a `deleted` resource event', async () => {
      grantOnly(AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS);

      await resolver.deleteSpace(actorContext, { ID: 'space-1' } as any);

      // The gate must NOT have fallen through — that is what makes this the
      // ALLOWED direction rather than a differently-spelled denial.
      expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalled();
      expect(resourceAudit().recordEventForActor).toHaveBeenCalledWith(
        actorContext,
        expect.arrayContaining([
          AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS,
        ]),
        expect.any(Array),
        expect.objectContaining({
          resourceKind: 'space',
          resourceId: 'space-1',
          outcome: 'deleted',
        })
      );
    });

    it('deleteSpace on the OWNER branch records NOTHING — FR-018a', async () => {
      grantOnly(AuthorizationPrivilege.DELETE);

      await resolver.deleteSpace(actorContext, { ID: 'space-1' } as any);

      expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalled();
      expect(resourceAudit().recordEventForActor).not.toHaveBeenCalled();
    });
  });
});
