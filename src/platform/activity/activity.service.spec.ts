import { EntityNotFoundException } from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { Activity } from './activity.entity';
import { ActivityService } from './activity.service';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

describe('ActivityService', () => {
  let service: ActivityService;
  let db: any;

  beforeEach(async () => {
    vi.spyOn(Activity, 'create').mockImplementation((input: any) => {
      const e = new Activity();
      Object.assign(e, input);
      return e as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        mockDrizzleProvider,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(ActivityService);
    db = module.get(DRIZZLE);
  });

  describe('createActivity', () => {
    it('should truncate description to SMALL_TEXT_LENGTH and save activity', async () => {
      const longDescription = 'a'.repeat(300);
      const savedActivity = {
        id: 'act-1',
        description: longDescription.substring(0, 256),
      } as Activity;
      db.returning.mockResolvedValueOnce([savedActivity]);

      const result = await service.createActivity({
        description: longDescription,
        resourceID: 'res-1',
        collaborationID: 'collab-1',
        parentID: 'parent-1',
        type: 'CALLOUT_PUBLISHED' as any,
        visibility: true,
        triggeredBy: 'user-1',
      });

      expect(result).toBe(savedActivity);
    });
  });

  describe('getActivityOrFail', () => {
    it('should return the activity when found', async () => {
      const activity = { id: 'act-1' } as Activity;
      db.query.activities.findFirst.mockResolvedValueOnce(activity);

      const result = await service.getActivityOrFail('act-1');

      expect(result).toBe(activity);
    });

    it('should throw EntityNotFoundException when activity not found', async () => {

      await expect(service.getActivityOrFail('missing')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('removeActivity', () => {
    it('should find and remove the activity', async () => {
      const activity = { id: 'act-1' } as Activity;
      db.query.activities.findFirst.mockResolvedValueOnce(activity);

      const result = await service.removeActivity('act-1');

      expect(result).toBe(activity);
    });

    it('should throw EntityNotFoundException when activity to remove not found', async () => {

      await expect(service.removeActivity('missing')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('updateActivityVisibility', () => {
    it('should set visibility on the activity and save it', async () => {
      const activity = { id: 'act-1', visibility: true } as Activity;
      db.returning.mockResolvedValueOnce([{ ...activity, visibility: false }]);

      const result = await service.updateActivityVisibility(activity, false);

      expect(activity.visibility).toBe(false);
      expect(result.visibility).toBe(false);
    });
  });

  describe('getActivityForMessage', () => {
    it('should return null and log warning when no activity found for message', async () => {
      // findFirst returns undefined by default, which triggers the null path
      const result = await service.getActivityForMessage('msg-123');

      expect(result).toBeNull();
    });

    it('should return the activity entry when found for message', async () => {
      const activity = { id: 'act-1', messageID: 'msg-123' } as Activity;
      db.query.activities.findFirst.mockResolvedValueOnce(activity);

      const result = await service.getActivityForMessage('msg-123');

      expect(result).toBe(activity);
    });
  });
});
