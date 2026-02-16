import { EntityNotFoundException } from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { MockType } from '@test/utils/mock.type';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { vi } from 'vitest';
import { Activity } from './activity.entity';
import { ActivityService } from './activity.service';

describe('ActivityService', () => {
  let service: ActivityService;
  let activityRepository: MockType<Repository<Activity>>;

  beforeEach(async () => {
    vi.spyOn(Activity, 'create').mockImplementation((input: any) => {
      const e = new Activity();
      Object.assign(e, input);
      return e as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        repositoryProviderMockFactory(Activity),
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(ActivityService);
    activityRepository = module.get(getRepositoryToken(Activity));
  });

  describe('createActivity', () => {
    it('should truncate description to SMALL_TEXT_LENGTH and save activity', async () => {
      const longDescription = 'a'.repeat(300);
      const savedActivity = {
        id: 'act-1',
        description: longDescription.substring(0, 256),
      } as Activity;
      activityRepository.save!.mockResolvedValue(savedActivity);

      const result = await service.createActivity({
        description: longDescription,
        resourceID: 'res-1',
        collaborationID: 'collab-1',
        parentID: 'parent-1',
        type: 'CALLOUT_PUBLISHED' as any,
        visibility: true,
        triggeredBy: 'user-1',
      });

      expect(activityRepository.save).toHaveBeenCalled();
      expect(result).toBe(savedActivity);
    });
  });

  describe('getActivityOrFail', () => {
    it('should return the activity when found', async () => {
      const activity = { id: 'act-1' } as Activity;
      activityRepository.findOne!.mockResolvedValue(activity);

      const result = await service.getActivityOrFail('act-1');

      expect(result).toBe(activity);
    });

    it('should throw EntityNotFoundException when activity not found', async () => {
      activityRepository.findOne!.mockResolvedValue(null);

      await expect(service.getActivityOrFail('missing')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('removeActivity', () => {
    it('should find and remove the activity', async () => {
      const activity = { id: 'act-1' } as Activity;
      activityRepository.findOne!.mockResolvedValue(activity);
      activityRepository.remove!.mockResolvedValue(activity);

      const result = await service.removeActivity('act-1');

      expect(activityRepository.remove).toHaveBeenCalledWith(activity);
      expect(result).toBe(activity);
    });

    it('should throw EntityNotFoundException when activity to remove not found', async () => {
      activityRepository.findOne!.mockResolvedValue(null);

      await expect(service.removeActivity('missing')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('updateActivityVisibility', () => {
    it('should set visibility on the activity and save it', async () => {
      const activity = { id: 'act-1', visibility: true } as Activity;
      activityRepository.save!.mockResolvedValue({
        ...activity,
        visibility: false,
      });

      const result = await service.updateActivityVisibility(activity, false);

      expect(activity.visibility).toBe(false);
      expect(activityRepository.save).toHaveBeenCalledWith(activity);
      expect(result.visibility).toBe(false);
    });
  });

  describe('getActivityForMessage', () => {
    it('should return null and log warning when no activity found for message', async () => {
      const mockQB = {
        where: vi.fn().mockReturnThis(),
        setParameters: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(null),
      };
      activityRepository.createQueryBuilder!.mockReturnValue(mockQB);

      const result = await service.getActivityForMessage('msg-123');

      expect(result).toBeNull();
    });

    it('should return the activity entry when found for message', async () => {
      const activity = { id: 'act-1', messageID: 'msg-123' } as Activity;
      const mockQB = {
        where: vi.fn().mockReturnThis(),
        setParameters: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(activity),
      };
      activityRepository.createQueryBuilder!.mockReturnValue(mockQB);

      const result = await service.getActivityForMessage('msg-123');

      expect(result).toBe(activity);
    });
  });
});
