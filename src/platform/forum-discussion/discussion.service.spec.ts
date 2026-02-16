import { EntityNotFoundException } from '@common/exceptions';
import { ProfileService } from '@domain/common/profile/profile.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { RoomService } from '../../domain/communication/room/room.service';
import { Discussion } from './discussion.entity';
import { IDiscussion } from './discussion.interface';
import { DiscussionService } from './discussion.service';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

describe('DiscussionService', () => {
  let service: DiscussionService;
  let profileService: ProfileService;
  let roomService: RoomService;
  let db: any;

  beforeEach(async () => {
    vi.spyOn(Discussion, 'create').mockImplementation((input: any) => {
      const e = new Discussion();
      Object.assign(e, input);
      return e as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscussionService,
        mockDrizzleProvider,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(DiscussionService);
    profileService = module.get(ProfileService);
    roomService = module.get(RoomService);
    db = module.get(DRIZZLE);
  });

  describe('getDiscussionOrFail', () => {
    it('should return the discussion when found', async () => {
      const discussion = { id: 'disc-1' } as Discussion;
      db.query.discussions.findFirst.mockResolvedValueOnce(discussion);

      const result = await service.getDiscussionOrFail('disc-1');

      expect(result).toBe(discussion);
    });

    it('should throw EntityNotFoundException when discussion not found', async () => {

      await expect(service.getDiscussionOrFail('missing')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('removeDiscussion', () => {
    it('should delete profile and room before removing discussion', async () => {
      const discussion = {
        id: 'disc-1',
        profile: { id: 'prof-1' },
        comments: { id: 'room-1' },
      } as unknown as Discussion;
      db.query.discussions.findFirst.mockResolvedValueOnce(discussion);

      await service.removeDiscussion({ ID: 'disc-1' });

      expect(vi.mocked(profileService.deleteProfile)).toHaveBeenCalledWith(
        'prof-1'
      );
      expect(vi.mocked(roomService.deleteRoom)).toHaveBeenCalledWith({
        roomID: 'room-1',
      });
    });

    it('should skip profile deletion when profile is undefined', async () => {
      const discussion = {
        id: 'disc-1',
        profile: undefined,
        comments: { id: 'room-1' },
      } as unknown as Discussion;
      db.query.discussions.findFirst.mockResolvedValueOnce(discussion);

      await service.removeDiscussion({ ID: 'disc-1' });

      expect(vi.mocked(profileService.deleteProfile)).not.toHaveBeenCalled();
    });

    it('should skip room deletion when comments is undefined', async () => {
      const discussion = {
        id: 'disc-1',
        profile: { id: 'prof-1' },
        comments: undefined,
      } as unknown as Discussion;
      db.query.discussions.findFirst.mockResolvedValueOnce(discussion);

      await service.removeDiscussion({ ID: 'disc-1' });

      expect(vi.mocked(roomService.deleteRoom)).not.toHaveBeenCalled();
    });
  });

  describe('updateDiscussion', () => {
    it('should update category when provided', async () => {
      const discussion = {
        id: 'disc-1',
        category: 'general',
        profile: { displayName: 'old' },
      } as unknown as IDiscussion;
      db.returning.mockResolvedValueOnce([discussion]);

      await service.updateDiscussion(discussion, {
        ID: 'disc-1',
        category: 'releases' as any,
      });

      expect(discussion.category).toBe('releases');
    });

    it('should sync room display name when displayName is changing', async () => {
      const discussion = {
        id: 'disc-1',
        category: 'general',
        profile: { displayName: 'Old Name' },
        comments: { id: 'room-1' },
      } as unknown as IDiscussion;
      vi.mocked(profileService.updateProfile).mockResolvedValue({
        displayName: 'New Name',
      } as any);
      db.returning.mockResolvedValueOnce([discussion]);

      await service.updateDiscussion(discussion, {
        ID: 'disc-1',
        profileData: { displayName: 'New Name' },
      });

      expect(vi.mocked(roomService.updateRoomDisplayName)).toHaveBeenCalledWith(
        discussion.comments,
        'discussion-New Name'
      );
    });

    it('should not sync room name when displayName is unchanged', async () => {
      const discussion = {
        id: 'disc-1',
        category: 'general',
        profile: { displayName: 'Same Name' },
        comments: { id: 'room-1' },
      } as unknown as IDiscussion;
      vi.mocked(profileService.updateProfile).mockResolvedValue({
        displayName: 'Same Name',
      } as any);
      db.returning.mockResolvedValueOnce([discussion]);

      await service.updateDiscussion(discussion, {
        ID: 'disc-1',
        profileData: { displayName: 'Same Name' },
      });

      expect(
        vi.mocked(roomService.updateRoomDisplayName)
      ).not.toHaveBeenCalled();
    });
  });

  describe('getComments', () => {
    it('should return the comments room when present', async () => {
      const room = { id: 'room-1' };
      const discussion = {
        id: 'disc-1',
        comments: room,
      } as unknown as Discussion;
      db.query.discussions.findFirst.mockResolvedValueOnce(discussion);

      const result = await service.getComments('disc-1');

      expect(result).toBe(room);
    });

    it('should throw EntityNotFoundException when comments room is missing', async () => {
      const discussion = {
        id: 'disc-1',
        comments: undefined,
      } as unknown as Discussion;
      db.query.discussions.findFirst.mockResolvedValueOnce(discussion);

      await expect(service.getComments('disc-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('isDiscussionInForum', () => {
    it('should return true when discussion belongs to the forum', async () => {
      db.query.discussions.findFirst.mockResolvedValueOnce({ id: 'disc-1' });

      const result = await service.isDiscussionInForum('disc-1', 'forum-1');

      expect(result).toBe(true);
    });

    it('should return false when discussion does not belong to the forum', async () => {
      // findFirst returns undefined by default
      const result = await service.isDiscussionInForum('disc-1', 'forum-1');

      expect(result).toBe(false);
    });
  });
});
