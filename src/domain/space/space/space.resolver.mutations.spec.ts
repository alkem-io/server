import { SUBSCRIPTION_SUBSPACE_CREATED } from '@common/constants/providers';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { SubscriptionType } from '@common/enums/subscription.type';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicenseService } from '@domain/common/license/license.service';
import { Test, TestingModule } from '@nestjs/testing';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { SpaceResolverMutations } from './space.resolver.mutations';
import { SpaceService } from './space.service';
import { SpaceAuthorizationService } from './space.service.authorization';
import { SpaceLicenseService } from './space.service.license';

describe('SpaceResolverMutations', () => {
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
    subspaceCreatedSubscription = { publish: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
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

  describe('updateSpacePlatformSettings', () => {
    it('should authorize, update platform settings, and reset auth policy', async () => {
      const actorContext = { actorID: 'actor-1' } as any;
      const updateData = { spaceID: 'space-1', nameID: 'new-name' } as any;
      const space = {
        id: 'space-1',
        authorization: { id: 'auth-1' },
        about: { profile: { displayName: 'Test' } },
      } as any;

      vi.mocked(spaceService.getSpaceOrFail).mockResolvedValue(space);
      vi.mocked(authorizationService.grantAccessOrFail).mockReturnValue(
        undefined as any
      );
      vi.mocked(spaceService.updateSpacePlatformSettings).mockResolvedValue(
        space
      );
      vi.mocked(spaceService.save).mockResolvedValue(space);
      vi.mocked(
        spaceAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);
      vi.mocked(authorizationPolicyService.saveAll).mockResolvedValue(
        undefined as any
      );

      await resolver.updateSpacePlatformSettings(actorContext, updateData);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        space.authorization,
        AuthorizationPrivilege.PLATFORM_ADMIN,
        expect.any(String)
      );
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
});
