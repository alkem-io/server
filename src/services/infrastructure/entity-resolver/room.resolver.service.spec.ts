import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { Conversation } from '@domain/communication/conversation/conversation.entity';
import { Space } from '@domain/space/space/space.entity';
import { CalendarEvent } from '@domain/timeline/event/event.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { Discussion } from '@platform/forum-discussion/discussion.entity';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { RoomResolverService } from './room.resolver.service';

describe('RoomResolverService', () => {
  let service: RoomResolverService;
  let entityManager: {
    findOne: Mock;
  };

  beforeEach(async () => {
    entityManager = {
      findOne: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomResolverService,
        {
          provide: getEntityManagerToken('default'),
          useValue: entityManager,
        },
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(RoomResolverService);
  });

  describe('getRoleSetAndSettingsForCollaborationCalloutsSet', () => {
    it('should return roleSet, platformRolesAccess, and spaceSettings when space is fully loaded', async () => {
      const mockRoleSet = { id: 'rs-1' };
      const mockSettings = { privacy: { mode: 'public' } };
      const mockPlatformRolesAccess = { roles: ['admin'] };
      entityManager.findOne.mockResolvedValue({
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
      expect(entityManager.findOne).toHaveBeenCalledWith(
        Space,
        expect.objectContaining({
          where: {
            collaboration: { calloutsSet: { id: 'callouts-set-1' } },
          },
        })
      );
    });

    it('should default platformRolesAccess to empty roles when space has no platformRolesAccess', async () => {
      entityManager.findOne.mockResolvedValue({
        community: { roleSet: { id: 'rs-1' } },
        settings: { privacy: {} },
        platformRolesAccess: undefined,
      });

      const result =
        await service.getRoleSetAndSettingsForCollaborationCalloutsSet(
          'callouts-set-1'
        );

      expect(result.platformRolesAccess).toEqual({ roles: [] });
    });

    it('should throw EntityNotInitializedException when space is not found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getRoleSetAndSettingsForCollaborationCalloutsSet('nonexistent')
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should throw EntityNotInitializedException when community roleSet is not initialized', async () => {
      entityManager.findOne.mockResolvedValue({
        community: { roleSet: undefined },
        settings: { privacy: {} },
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
      entityManager.findOne.mockResolvedValue({
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
      entityManager.findOne.mockResolvedValue(null);

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
      const mockContribution = { post: mockPost };
      const mockCallout = { contributions: [mockContribution] };
      entityManager.findOne.mockResolvedValue(mockCallout);

      const result =
        await service.getCalloutWithPostContributionForRoom('room-1');

      expect(result.post).toBe(mockPost);
      expect(result.callout).toBe(mockCallout);
      expect(result.contribution).toBe(mockContribution);
    });

    it('should throw EntityNotFoundException when callout is not found for room', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getCalloutWithPostContributionForRoom('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw EntityNotFoundException when callout has no contributions', async () => {
      entityManager.findOne.mockResolvedValue({ contributions: [] });

      await expect(
        service.getCalloutWithPostContributionForRoom('room-1')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getCalloutForRoom', () => {
    it('should return callout when found for comments room', async () => {
      const mockCallout = { id: 'callout-1', calloutsSet: { id: 'cs-1' } };
      entityManager.findOne.mockResolvedValue(mockCallout);

      const result = await service.getCalloutForRoom('comments-1');

      expect(result).toBe(mockCallout);
      expect(entityManager.findOne).toHaveBeenCalledWith(
        Callout,
        expect.objectContaining({
          where: { comments: { id: 'comments-1' } },
        })
      );
    });

    it('should throw EntityNotFoundException when no callout found for room', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(service.getCalloutForRoom('nonexistent')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getCalendarEventForRoom', () => {
    it('should return calendar event when found', async () => {
      const mockEvent = { id: 'event-1', profile: { id: 'p-1' } };
      entityManager.findOne.mockResolvedValue(mockEvent);

      const result = await service.getCalendarEventForRoom('comments-1');

      expect(result).toBe(mockEvent);
      expect(entityManager.findOne).toHaveBeenCalledWith(
        CalendarEvent,
        expect.objectContaining({
          where: { comments: { id: 'comments-1' } },
        })
      );
    });

    it('should throw EntityNotFoundException when no calendar event found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getCalendarEventForRoom('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getDiscussionForRoom', () => {
    it('should return discussion when found', async () => {
      const mockDiscussion = { id: 'disc-1', profile: { id: 'p-1' } };
      entityManager.findOne.mockResolvedValue(mockDiscussion);

      const result = await service.getDiscussionForRoom('comments-1');

      expect(result).toBe(mockDiscussion);
      expect(entityManager.findOne).toHaveBeenCalledWith(
        Discussion,
        expect.objectContaining({
          where: { comments: { id: 'comments-1' } },
        })
      );
    });

    it('should throw EntityNotFoundException when no discussion found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(service.getDiscussionForRoom('nonexistent')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getConversationForRoom', () => {
    it('should return conversation when found', async () => {
      const mockConversation = { id: 'conv-1' };
      entityManager.findOne.mockResolvedValue(mockConversation);

      const result = await service.getConversationForRoom('room-1');

      expect(result).toBe(mockConversation);
      expect(entityManager.findOne).toHaveBeenCalledWith(
        Conversation,
        expect.objectContaining({
          where: { room: { id: 'room-1' } },
        })
      );
    });

    it('should throw EntityNotFoundException when no conversation found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      await expect(
        service.getConversationForRoom('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });
});
