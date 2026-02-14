import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockType } from '@test/utils/mock.type';
import { Repository } from 'typeorm';
import { Discussion } from './discussion.entity';
import { DiscussionService } from './discussion.service';
import { EntityNotFoundException } from '@common/exceptions';
import { ProfileService } from '@domain/common/profile/profile.service';
import { RoomService } from '../../domain/communication/room/room.service';
import { IDiscussion } from './discussion.interface';
import { vi } from 'vitest';

describe('DiscussionService', () => {
  let service: DiscussionService;
  let discussionRepository: MockType<Repository<Discussion>>;
  let profileService: ProfileService;
  let roomService: RoomService;

  beforeEach(async () => {
    vi.spyOn(Discussion, 'create').mockImplementation((input: any) => {
      const e = new Discussion();
      Object.assign(e, input);
      return e as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscussionService,
        repositoryProviderMockFactory(Discussion),
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(DiscussionService);
    discussionRepository = module.get(getRepositoryToken(Discussion));
    profileService = module.get(ProfileService);
    roomService = module.get(RoomService);
  });

  describe('getDiscussionOrFail', () => {
    it('should return the discussion when found', async () => {
      const discussion = { id: 'disc-1' } as Discussion;
      discussionRepository.findOne!.mockResolvedValue(discussion);

      const result = await service.getDiscussionOrFail('disc-1');

      expect(result).toBe(discussion);
    });

    it('should throw EntityNotFoundException when discussion not found', async () => {
      discussionRepository.findOne!.mockResolvedValue(null);

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
      discussionRepository.findOne!.mockResolvedValue(discussion);
      discussionRepository.remove!.mockResolvedValue({ id: '' } as Discussion);

      await service.removeDiscussion({ ID: 'disc-1' });

      expect(vi.mocked(profileService.deleteProfile)).toHaveBeenCalledWith(
        'prof-1'
      );
      expect(vi.mocked(roomService.deleteRoom)).toHaveBeenCalledWith({
        roomID: 'room-1',
      });
      expect(discussionRepository.remove).toHaveBeenCalled();
    });

    it('should skip profile deletion when profile is undefined', async () => {
      const discussion = {
        id: 'disc-1',
        profile: undefined,
        comments: { id: 'room-1' },
      } as unknown as Discussion;
      discussionRepository.findOne!.mockResolvedValue(discussion);
      discussionRepository.remove!.mockResolvedValue({ id: '' } as Discussion);

      await service.removeDiscussion({ ID: 'disc-1' });

      expect(vi.mocked(profileService.deleteProfile)).not.toHaveBeenCalled();
    });

    it('should skip room deletion when comments is undefined', async () => {
      const discussion = {
        id: 'disc-1',
        profile: { id: 'prof-1' },
        comments: undefined,
      } as unknown as Discussion;
      discussionRepository.findOne!.mockResolvedValue(discussion);
      discussionRepository.remove!.mockResolvedValue({ id: '' } as Discussion);

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
      discussionRepository.save!.mockResolvedValue(discussion);

      await service.updateDiscussion(discussion, {
        ID: 'disc-1',
        category: 'releases' as any,
      });

      expect(discussion.category).toBe('releases');
      expect(discussionRepository.save).toHaveBeenCalled();
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
      discussionRepository.save!.mockResolvedValue(discussion);

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
      discussionRepository.save!.mockResolvedValue(discussion);

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
      const discussion = { id: 'disc-1', comments: room } as unknown as Discussion;
      discussionRepository.findOne!.mockResolvedValue(discussion);

      const result = await service.getComments('disc-1');

      expect(result).toBe(room);
    });

    it('should throw EntityNotFoundException when comments room is missing', async () => {
      const discussion = { id: 'disc-1', comments: undefined } as unknown as Discussion;
      discussionRepository.findOne!.mockResolvedValue(discussion);

      await expect(service.getComments('disc-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('isDiscussionInForum', () => {
    it('should return true when discussion belongs to the forum', async () => {
      const mockQB = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        setParameters: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue({ id: 'disc-1' }),
      };
      discussionRepository.createQueryBuilder!.mockReturnValue(mockQB);

      const result = await service.isDiscussionInForum('disc-1', 'forum-1');

      expect(result).toBe(true);
    });

    it('should return false when discussion does not belong to the forum', async () => {
      const mockQB = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        setParameters: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(null),
      };
      discussionRepository.createQueryBuilder!.mockReturnValue(mockQB);

      const result = await service.isDiscussionInForum('disc-1', 'forum-1');

      expect(result).toBe(false);
    });
  });
});
