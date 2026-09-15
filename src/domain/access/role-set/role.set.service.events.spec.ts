import { ActorType } from '@common/enums/actor.type';
import { CommunityMembershipOrigin } from '@common/enums/community.membership.origin';
import { SpaceLevel } from '@common/enums/space.level';
import { RoleSetMembershipException } from '@common/exceptions/role.set.membership.exception';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { NotificationOrganizationAdapter } from '@services/adapters/notification-adapter/notification.organization.adapter';
import { NotificationSpaceAdapter } from '@services/adapters/notification-adapter/notification.space.adapter';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { RoleSetEventsService } from './role.set.service.events';

describe('RoleSetEventsService', () => {
  let service: RoleSetEventsService;
  let contributionReporter: ContributionReporterService;
  let notificationAdapterSpace: NotificationSpaceAdapter;
  let notificationAdapterOrganization: NotificationOrganizationAdapter;
  let activityAdapter: ActivityAdapter;
  let communityResolverService: CommunityResolverService;
  let organizationLookupService: OrganizationLookupService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [RoleSetEventsService, MockCacheManager, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<RoleSetEventsService>(RoleSetEventsService);
    contributionReporter = module.get<ContributionReporterService>(
      ContributionReporterService
    );
    notificationAdapterSpace = module.get<NotificationSpaceAdapter>(
      NotificationSpaceAdapter
    );
    notificationAdapterOrganization =
      module.get<NotificationOrganizationAdapter>(
        NotificationOrganizationAdapter
      );
    activityAdapter = module.get<ActivityAdapter>(ActivityAdapter);
    communityResolverService = module.get<CommunityResolverService>(
      CommunityResolverService
    );
    organizationLookupService = module.get<OrganizationLookupService>(
      OrganizationLookupService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerCommunityNewMemberActivity', () => {
    it('should register activity for new member', async () => {
      const mockRoleSet = { id: 'rs-1' } as any;
      const mockCommunity = { id: 'community-1', parentID: 'space-1' } as any;
      const actorContext = { actorID: 'trigger-user' } as any;

      (
        communityResolverService.getCommunityForRoleSet as Mock
      ).mockResolvedValue(mockCommunity);
      (activityAdapter.memberJoined as Mock).mockResolvedValue(undefined);

      await service.registerCommunityNewMemberActivity(
        mockRoleSet,
        'actor-1',
        actorContext
      );

      expect(
        communityResolverService.getCommunityForRoleSet
      ).toHaveBeenCalledWith('rs-1');
      expect(activityAdapter.memberJoined).toHaveBeenCalledWith(
        expect.objectContaining({
          triggeredBy: 'trigger-user',
          community: mockCommunity,
          contributor: { id: 'actor-1' },
        })
      );
    });
  });

  describe('processCommunityNewMemberEvents', () => {
    it('should process L0 space events', async () => {
      const mockRoleSet = { id: 'rs-1' } as any;
      const mockCommunity = { id: 'community-1', parentID: 'space-1' } as any;
      const mockSpace = {
        level: SpaceLevel.L0,
        levelZeroSpaceID: 'l0-space-1',
      } as any;
      const actorContext = { actorID: 'trigger-user' } as any;

      (
        communityResolverService.getCommunityForRoleSet as Mock
      ).mockResolvedValue(mockCommunity);
      (
        communityResolverService.getSpaceForRoleSetOrFail as Mock
      ).mockResolvedValue(mockSpace);
      (
        communityResolverService.getDisplayNameForRoleSetOrFail as Mock
      ).mockResolvedValue('Test Space');
      (
        notificationAdapterSpace.spaceCommunityNewMember as Mock
      ).mockResolvedValue(undefined);

      await service.processCommunityNewMemberEvents(
        mockRoleSet,
        actorContext,
        'actor-1',
        ActorType.USER
      );

      expect(contributionReporter.spaceJoined).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'space-1',
          name: 'Test Space',
          space: 'l0-space-1',
        }),
        { actorID: 'actor-1' }
      );
    });

    it('should process L1 subspace events', async () => {
      const mockRoleSet = { id: 'rs-1' } as any;
      const mockCommunity = {
        id: 'community-1',
        parentID: 'subspace-1',
      } as any;
      const mockSpace = {
        level: SpaceLevel.L1,
        levelZeroSpaceID: 'l0-space-1',
      } as any;
      const actorContext = { actorID: 'trigger-user' } as any;

      (
        communityResolverService.getCommunityForRoleSet as Mock
      ).mockResolvedValue(mockCommunity);
      (
        communityResolverService.getSpaceForRoleSetOrFail as Mock
      ).mockResolvedValue(mockSpace);
      (
        communityResolverService.getDisplayNameForRoleSetOrFail as Mock
      ).mockResolvedValue('Test Subspace');
      (
        notificationAdapterSpace.spaceCommunityNewMember as Mock
      ).mockResolvedValue(undefined);

      await service.processCommunityNewMemberEvents(
        mockRoleSet,
        actorContext,
        'actor-1',
        ActorType.USER
      );

      expect(contributionReporter.subspaceJoined).toHaveBeenCalled();
    });

    it('should throw for invalid space level', async () => {
      const mockRoleSet = { id: 'rs-1' } as any;
      const mockCommunity = { id: 'community-1', parentID: 'space-1' } as any;
      const mockSpace = {
        level: 'INVALID' as any,
        levelZeroSpaceID: 'l0-space-1',
      } as any;
      const actorContext = { actorID: 'trigger-user' } as any;

      (
        communityResolverService.getCommunityForRoleSet as Mock
      ).mockResolvedValue(mockCommunity);
      (
        communityResolverService.getSpaceForRoleSetOrFail as Mock
      ).mockResolvedValue(mockSpace);
      (
        communityResolverService.getDisplayNameForRoleSetOrFail as Mock
      ).mockResolvedValue('Test Space');
      (
        notificationAdapterSpace.spaceCommunityNewMember as Mock
      ).mockResolvedValue(undefined);

      await expect(
        service.processCommunityNewMemberEvents(
          mockRoleSet,
          actorContext,
          'actor-1',
          ActorType.USER
        )
      ).rejects.toThrow(RoleSetMembershipException);
    });
  });

  describe('processOrganizationNewAssociateEvents', () => {
    it('resolves the organization for the role set and dispatches organizationAdminAssociateJoined with the membership origin threaded through', async () => {
      const mockRoleSet = { id: 'org-rs-1' } as any;
      const actorContext = { actorID: 'admin-1' } as any;

      (
        organizationLookupService.getOrganizationForRoleSetOrFail as Mock
      ).mockResolvedValue({ id: 'org-1' });
      (
        notificationAdapterOrganization.organizationAdminAssociateJoined as Mock
      ).mockResolvedValue(undefined);

      await service.processOrganizationNewAssociateEvents(
        mockRoleSet,
        actorContext,
        'associate-1',
        CommunityMembershipOrigin.DIRECT
      );

      expect(
        organizationLookupService.getOrganizationForRoleSetOrFail
      ).toHaveBeenCalledWith('org-rs-1');
      expect(
        notificationAdapterOrganization.organizationAdminAssociateJoined
      ).toHaveBeenCalledWith({
        triggeredBy: 'admin-1',
        organizationID: 'org-1',
        associateID: 'associate-1',
        membershipOrigin: CommunityMembershipOrigin.DIRECT,
      });
    });

    it('still dispatches for an INVITATION origin — suppression is the adapter’s job, not this method’s', async () => {
      const mockRoleSet = { id: 'org-rs-1' } as any;
      const actorContext = { actorID: 'invitee-1' } as any;

      (
        organizationLookupService.getOrganizationForRoleSetOrFail as Mock
      ).mockResolvedValue({ id: 'org-1' });
      (
        notificationAdapterOrganization.organizationAdminAssociateJoined as Mock
      ).mockResolvedValue(undefined);

      await service.processOrganizationNewAssociateEvents(
        mockRoleSet,
        actorContext,
        'associate-1',
        CommunityMembershipOrigin.INVITATION
      );

      expect(
        notificationAdapterOrganization.organizationAdminAssociateJoined
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          membershipOrigin: CommunityMembershipOrigin.INVITATION,
        })
      );
    });
  });
});
