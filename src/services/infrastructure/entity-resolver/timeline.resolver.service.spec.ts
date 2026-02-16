import { EntityNotFoundException } from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { TimelineResolverService } from './timeline.resolver.service';

describe('TimelineResolverService', () => {
  let service: TimelineResolverService;
  let db: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimelineResolverService,
        mockDrizzleProvider,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(TimelineResolverService);
    db = module.get(DRIZZLE);
  });

  describe('getTimelineIdForCalendar', () => {
    it('should return the timeline ID when a timeline exists for the calendar', async () => {
      db.query.timelines.findFirst.mockResolvedValue({ id: 'timeline-1' });

      const result = await service.getTimelineIdForCalendar('calendar-1');

      expect(result).toBe('timeline-1');
    });

    it('should return undefined when no timeline exists for the calendar', async () => {
      db.query.timelines.findFirst.mockResolvedValue(null);

      const result = await service.getTimelineIdForCalendar('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('getCollaborationIdForCalendar', () => {
    it('should return the collaboration ID when both timeline and collaboration exist', async () => {
      db.query.timelines.findFirst.mockResolvedValue({ id: 'timeline-1' });
      db.query.collaborations.findFirst.mockResolvedValue({ id: 'collab-1' });

      const result = await service.getCollaborationIdForCalendar('calendar-1');

      expect(result).toBe('collab-1');
    });

    it('should return empty string when no timeline exists for the calendar', async () => {
      db.query.timelines.findFirst.mockResolvedValue(null);

      const result = await service.getCollaborationIdForCalendar('calendar-1');

      expect(result).toBe('');
    });

    it('should return empty string when timeline exists but no collaboration is found', async () => {
      db.query.timelines.findFirst.mockResolvedValue({ id: 'timeline-1' });
      db.query.collaborations.findFirst.mockResolvedValue(null);

      const result = await service.getCollaborationIdForCalendar('calendar-1');

      expect(result).toBe('');
    });
  });

  describe('getSpaceIdForCalendar', () => {
    it('should return the space ID when the full chain resolves successfully', async () => {
      db.query.timelines.findFirst.mockResolvedValue({ id: 'timeline-1' });
      db.query.collaborations.findFirst.mockResolvedValue({ id: 'collab-1' });
      db.query.spaces.findFirst.mockResolvedValue({ id: 'space-1' });

      const result = await service.getSpaceIdForCalendar('calendar-1');

      expect(result).toBe('space-1');
    });

    it('should throw EntityNotFoundException when no space is found for the collaboration', async () => {
      db.query.timelines.findFirst.mockResolvedValue({ id: 'timeline-1' });
      db.query.collaborations.findFirst.mockResolvedValue({ id: 'collab-1' });
      db.query.spaces.findFirst.mockResolvedValue(null);

      await expect(service.getSpaceIdForCalendar('calendar-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should throw EntityNotFoundException when collaboration resolves to empty string (timeline not found)', async () => {
      db.query.timelines.findFirst.mockResolvedValue(null);
      db.query.spaces.findFirst.mockResolvedValue(null);

      await expect(service.getSpaceIdForCalendar('calendar-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });
});
