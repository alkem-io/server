import { RoomType } from '@common/enums/room.type';
import { EntityNotFoundException } from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import { CommunityResolverService } from './community.resolver.service';

describe('CommunityResolverService', () => {
  let service: CommunityResolverService;
  let db: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunityResolverService,
        mockDrizzleProvider,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CommunityResolverService);
    db = module.get(DRIZZLE);
  });

  describe('getLevelZeroSpaceIdForRoleSet', () => {
    it('should return levelZeroSpaceID when space exists', async () => {
      db.query.communities.findFirst.mockResolvedValueOnce({ id: 'community-1', roleSetId: 'roleset-1' });
      db.query.spaces.findFirst.mockResolvedValueOnce({ id: 'space-1', levelZeroSpaceID: 'level0-space-1' });

      const result = await service.getLevelZeroSpaceIdForRoleSet('roleset-1');

      expect(result).toBe('level0-space-1');
    });

    it('should throw EntityNotFoundException when no space found for roleSet', async () => {
      db.query.communities.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.getLevelZeroSpaceIdForRoleSet('missing-roleset')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getCommunityForRoleSet', () => {
    it('should return community when found via roleSet', async () => {
      const community = { id: 'community-1' };
      db.query.communities.findFirst.mockResolvedValueOnce(community);

      const result = await service.getCommunityForRoleSet('roleset-1');

      expect(result).toBe(community);
    });

    it('should throw EntityNotFoundException when no community found', async () => {
      db.query.communities.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.getCommunityForRoleSet('missing-roleset')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getCommunicationForRoleSet', () => {
    it('should return communication when community has it', async () => {
      const communication = { id: 'comm-1' };
      db.query.communities.findFirst.mockResolvedValueOnce({
        id: 'community-1',
        communication,
      });

      const result = await service.getCommunicationForRoleSet('roleset-1');

      expect(result).toBe(communication);
    });

    it('should throw when community found but communication is null', async () => {
      db.query.communities.findFirst.mockResolvedValueOnce({
        id: 'community-1',
        communication: null,
      });

      await expect(
        service.getCommunicationForRoleSet('roleset-1')
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw when no community found at all', async () => {
      db.query.communities.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.getCommunicationForRoleSet('missing-roleset')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('isRoleSetAccountMatchingVcAccount', () => {
    it('should return true when VC belongs to the same account as roleSet', async () => {
      // getLevelZeroSpaceIdForRoleSet: communities.findFirst + spaces.findFirst
      db.query.communities.findFirst.mockResolvedValueOnce({ id: 'community-1' });
      db.query.spaces.findFirst
        .mockResolvedValueOnce({ id: 'space-1', levelZeroSpaceID: 'l0-space' })
        // getAccountForRoleSetOrFail: spaces.findFirst with account
        .mockResolvedValueOnce({
          id: 'l0-space',
          account: { id: 'account-1' },
        });
      // isRoleSetAccountMatchingVcAccount: virtualContributors.findFirst
      db.query.virtualContributors.findFirst.mockResolvedValueOnce({ id: 'vc-1' });

      const result = await service.isRoleSetAccountMatchingVcAccount(
        'roleset-1',
        'vc-1'
      );

      expect(result).toBe(true);
    });

    it('should return false when VC does not belong to the same account', async () => {
      db.query.communities.findFirst.mockResolvedValueOnce({ id: 'community-1' });
      db.query.spaces.findFirst
        .mockResolvedValueOnce({ id: 'space-1', levelZeroSpaceID: 'l0-space' })
        .mockResolvedValueOnce({
          id: 'l0-space',
          account: { id: 'account-1' },
        });
      db.query.virtualContributors.findFirst.mockResolvedValueOnce(null);

      const result = await service.isRoleSetAccountMatchingVcAccount(
        'roleset-1',
        'vc-1'
      );

      expect(result).toBe(false);
    });
  });

  describe('getCommunityFromRoom', () => {
    it('should delegate to getCommunityFromCollaborationCalloutRoomOrFail for CALLOUT rooms', async () => {
      const community = { id: 'community-1' };
      // getCommunityFromCollaborationCalloutRoomOrFail: callouts -> collaborations -> spaces
      db.query.callouts.findFirst.mockResolvedValueOnce({ id: 'callout-1', calloutsSetId: 'cs-1' });
      db.query.collaborations.findFirst.mockResolvedValueOnce({ id: 'collab-1' });
      db.query.spaces.findFirst.mockResolvedValueOnce({
        id: 'space-1',
        community: { ...community, roleSet: {} },
      });

      const result = await service.getCommunityFromRoom(
        'comments-1',
        RoomType.CALLOUT
      );

      expect(result).toEqual(expect.objectContaining({ id: 'community-1' }));
    });

    it('should delegate to getCommunityFromPostRoomOrFail for POST rooms', async () => {
      const community = { id: 'community-2' };
      // getCommunityFromPostRoomOrFail: posts -> calloutContributions -> collaborations -> spaces
      db.query.posts.findFirst.mockResolvedValueOnce({ id: 'post-1' });
      db.query.calloutContributions.findFirst.mockResolvedValueOnce({
        callout: { calloutsSetId: 'cs-1' },
      });
      db.query.collaborations.findFirst.mockResolvedValueOnce({ id: 'collab-1' });
      db.query.spaces.findFirst.mockResolvedValueOnce({
        id: 'space-1',
        community: { ...community, roleSet: {} },
      });

      const result = await service.getCommunityFromRoom(
        'comments-1',
        RoomType.POST
      );

      expect(result).toEqual(expect.objectContaining({ id: 'community-2' }));
    });

    it('should throw EntityNotFoundException for unsupported room types', async () => {
      await expect(
        service.getCommunityFromRoom('id-1', RoomType.UPDATES)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getCommunityFromWhiteboardOrFail', () => {
    it('should check contributions first, then framing if not found', async () => {
      const community = { id: 'comm-1', roleSet: {} };
      // contributions check returns null
      db.query.calloutContributions.findFirst.mockResolvedValueOnce(null);
      // framing check
      db.query.calloutFramings.findFirst.mockResolvedValueOnce({ id: 'framing-1' });
      db.query.callouts.findFirst.mockResolvedValueOnce({ id: 'callout-1', calloutsSetId: 'cs-1' });
      db.query.collaborations.findFirst.mockResolvedValueOnce({ id: 'collab-1' });
      db.query.spaces.findFirst.mockResolvedValueOnce({
        id: 'space-1',
        community,
      });

      const result = await service.getCommunityFromWhiteboardOrFail('wb-1');

      expect(result).toBe(community);
    });

    it('should throw when whiteboard not found in contributions or framing', async () => {
      db.query.calloutContributions.findFirst.mockResolvedValueOnce(null);
      db.query.calloutFramings.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.getCommunityFromWhiteboardOrFail('wb-missing')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getCommunityForMemoOrFail', () => {
    it('should throw when no space found for memo', async () => {
      db.query.calloutContributions.findFirst.mockResolvedValueOnce(null);
      db.query.calloutFramings.findFirst.mockResolvedValueOnce(null);

      await expect(service.getCommunityForMemoOrFail('memo-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should throw when space found but community is null', async () => {
      db.query.calloutContributions.findFirst.mockResolvedValueOnce({
        callout: { calloutsSetId: 'cs-1' },
      });
      db.query.collaborations.findFirst.mockResolvedValueOnce({ id: 'collab-1' });
      db.query.spaces.findFirst.mockResolvedValueOnce({
        id: 'space-1',
        community: null,
      });

      await expect(service.getCommunityForMemoOrFail('memo-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });
});
