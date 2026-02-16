import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import { RoomResolverService } from './room.resolver.service';

describe('RoomResolverService', () => {
  let service: RoomResolverService;
  let db: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomResolverService,
        mockDrizzleProvider,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(RoomResolverService);
    db = module.get(DRIZZLE);
  });

  describe('getRoleSetAndSettingsForCollaborationCalloutsSet', () => {
    it('should return roleSet, platformRolesAccess, and spaceSettings when space is fully loaded', async () => {
      const mockRoleSet = { id: 'rs-1' };
      const mockSettings = { privacy: { mode: 'public' } };
      const mockPlatformRolesAccess = { roles: ['admin'] };

      db.query.collaborations.findFirst.mockResolvedValueOnce({ id: 'collab-1' });
      db.query.spaces.findFirst.mockResolvedValueOnce({
        id: 'space-1',
        community: { roleSet: mockRoleSet },
        settings: mockSettings,
        platformRolesAccess: mockPlatformRolesAccess,
      });

      const result =
        await service.getRoleSetAndSettingsForCollaborationCalloutsSet(
          'callouts-set-1'
        );

      expect(result.roleSet).toBe(mockRoleSet);
      expect(result.spaceSettings).toBe(mockSettings);
      expect(result.platformRolesAccess).toBe(mockPlatformRolesAccess);
    });

    it('should default platformRolesAccess to empty roles when space has no platformRolesAccess', async () => {
      db.query.collaborations.findFirst.mockResolvedValueOnce({ id: 'collab-1' });
      db.query.spaces.findFirst.mockResolvedValueOnce({
        id: 'space-1',
        community: { roleSet: { id: 'rs-1' } },
        settings: { privacy: {} },
        platformRolesAccess: null,
      });

      const result =
        await service.getRoleSetAndSettingsForCollaborationCalloutsSet(
          'callouts-set-1'
        );

      expect(result.platformRolesAccess).toEqual({ roles: [] });
    });

    it('should throw EntityNotInitializedException when space is not found', async () => {
      db.query.collaborations.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.getRoleSetAndSettingsForCollaborationCalloutsSet('nonexistent')
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should throw EntityNotInitializedException when community roleSet is not initialized', async () => {
      db.query.collaborations.findFirst.mockResolvedValueOnce({ id: 'collab-1' });
      db.query.spaces.findFirst.mockResolvedValueOnce({
        id: 'space-1',
        community: { roleSet: null },
        settings: null,
      });

      await expect(
        service.getRoleSetAndSettingsForCollaborationCalloutsSet(
          'callouts-set-1'
        )
      ).rejects.toThrow(EntityNotInitializedException);
    });
  });

  describe('getRoleSetAndPlatformRolesWithAccessForCallout', () => {
    it('should return roleSet and spaceSettings when space is found', async () => {
      const mockRoleSet = { id: 'rs-1' };
      const mockSettings = { privacy: {} };

      // callouts.findFirst returns callout with calloutsSetId
      db.query.callouts.findFirst.mockResolvedValueOnce({ id: 'callout-1', calloutsSetId: 'cs-1' });
      // collaborations.findFirst
      db.query.collaborations.findFirst.mockResolvedValueOnce({ id: 'collab-1' });
      // spaces.findFirst with community.roleSet
      db.query.spaces.findFirst.mockResolvedValueOnce({
        id: 'space-1',
        community: { roleSet: mockRoleSet },
        settings: mockSettings,
        platformRolesAccess: { roles: ['member'] },
      });

      const result =
        await service.getRoleSetAndPlatformRolesWithAccessForCallout(
          'callout-1'
        );

      expect(result.roleSet).toBe(mockRoleSet);
      expect(result.spaceSettings).toBe(mockSettings);
      expect(result.platformRolesAccess).toEqual({ roles: ['member'] });
    });

    it('should return undefined roleSet and spaceSettings when space is not found (KnowledgeBase callout)', async () => {
      // callouts.findFirst returns callout without calloutsSetId (or null collaboration)
      db.query.callouts.findFirst.mockResolvedValueOnce({ id: 'kb-callout-1', calloutsSetId: null });

      const result =
        await service.getRoleSetAndPlatformRolesWithAccessForCallout(
          'kb-callout-1'
        );

      expect(result.roleSet).toBeUndefined();
      expect(result.spaceSettings).toBeUndefined();
      expect(result.platformRolesAccess).toEqual({ roles: [] });
    });
  });

  describe('getCalloutWithPostContributionForRoom', () => {
    it('should return post, callout, and contribution when found', async () => {
      const mockPost = { id: 'post-1', profile: { id: 'p-1' } };
      const mockCallout = { id: 'callout-1' };
      const mockContribution = { callout: mockCallout };

      db.query.posts.findFirst.mockResolvedValueOnce(mockPost);
      db.query.calloutContributions.findFirst.mockResolvedValueOnce(mockContribution);

      const result =
        await service.getCalloutWithPostContributionForRoom('room-1');

      expect(result.post).toBe(mockPost);
      expect(result.callout).toBe(mockCallout);
      expect(result.contribution).toBe(mockContribution);
    });

    it('should throw EntityNotFoundException when callout is not found for room', async () => {
      db.query.posts.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.getCalloutWithPostContributionForRoom('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw EntityNotFoundException when callout has no contributions', async () => {
      db.query.posts.findFirst.mockResolvedValueOnce({ id: 'post-1' });
      db.query.calloutContributions.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.getCalloutWithPostContributionForRoom('room-1')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getCalloutForRoom', () => {
    it('should return callout when found for comments room', async () => {
      const mockCallout = { id: 'callout-1', calloutsSet: { id: 'cs-1' } };
      db.query.callouts.findFirst.mockResolvedValueOnce(mockCallout);

      const result = await service.getCalloutForRoom('comments-1');

      expect(result).toBe(mockCallout);
    });

    it('should throw EntityNotFoundException when no callout found for room', async () => {
      db.query.callouts.findFirst.mockResolvedValueOnce(null);

      await expect(service.getCalloutForRoom('nonexistent')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getCalendarEventForRoom', () => {
    it('should return calendar event when found', async () => {
      const mockEvent = { id: 'event-1', profile: { id: 'p-1' } };
      db.query.calendarEvents.findFirst.mockResolvedValueOnce(mockEvent);

      const result = await service.getCalendarEventForRoom('comments-1');

      expect(result).toBe(mockEvent);
    });

    it('should throw EntityNotFoundException when no calendar event found', async () => {
      db.query.calendarEvents.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.getCalendarEventForRoom('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getDiscussionForRoom', () => {
    it('should return discussion when found', async () => {
      const mockDiscussion = { id: 'disc-1', profile: { id: 'p-1' } };
      db.query.discussions.findFirst.mockResolvedValueOnce(mockDiscussion);

      const result = await service.getDiscussionForRoom('comments-1');

      expect(result).toBe(mockDiscussion);
    });

    it('should throw EntityNotFoundException when no discussion found', async () => {
      db.query.discussions.findFirst.mockResolvedValueOnce(null);

      await expect(service.getDiscussionForRoom('nonexistent')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getConversationForRoom', () => {
    it('should return conversation when found', async () => {
      const mockConversation = { id: 'conv-1' };
      db.query.conversations.findFirst.mockResolvedValueOnce(mockConversation);

      const result = await service.getConversationForRoom('room-1');

      expect(result).toBe(mockConversation);
    });

    it('should throw EntityNotFoundException when no conversation found', async () => {
      db.query.conversations.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.getConversationForRoom('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });
});
