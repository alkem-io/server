import { Timeline } from '@domain/timeline/timeline/timeline.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { EntityNotFoundError } from 'typeorm';
import { type Mock, vi } from 'vitest';
import { TimelineResolverService } from './timeline.resolver.service';

describe('TimelineResolverService', () => {
  let service: TimelineResolverService;
  let entityManager: {
    findOne: Mock;
  };

  beforeEach(async () => {
    entityManager = {
      findOne: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimelineResolverService,
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

    service = module.get(TimelineResolverService);
  });

  describe('getTimelineIdForCalendar', () => {
    it('should return the timeline ID when a timeline exists for the calendar', async () => {
      entityManager.findOne.mockResolvedValue({ id: 'timeline-1' });

      const result = await service.getTimelineIdForCalendar('calendar-1');

      expect(result).toBe('timeline-1');
      expect(entityManager.findOne).toHaveBeenCalledWith(
        Timeline,
        expect.objectContaining({
          where: { calendar: { id: 'calendar-1' } },
        })
      );
    });

    it('should return undefined when no timeline exists for the calendar', async () => {
      entityManager.findOne.mockResolvedValue(null);

      const result = await service.getTimelineIdForCalendar('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('getCollaborationIdForCalendar', () => {
    it('should return the collaboration ID when both timeline and collaboration exist', async () => {
      // First call: find Timeline, second call: find Collaboration
      entityManager.findOne
        .mockResolvedValueOnce({ id: 'timeline-1' })
        .mockResolvedValueOnce({ id: 'collab-1' });

      const result = await service.getCollaborationIdForCalendar('calendar-1');

      expect(result).toBe('collab-1');
    });

    it('should return empty string when no timeline exists for the calendar', async () => {
      // Timeline not found
      entityManager.findOne.mockResolvedValue(null);

      const result = await service.getCollaborationIdForCalendar('calendar-1');

      expect(result).toBe('');
    });

    it('should return empty string when timeline exists but no collaboration is found', async () => {
      // First call: find Timeline, second call: Collaboration not found
      entityManager.findOne
        .mockResolvedValueOnce({ id: 'timeline-1' })
        .mockResolvedValueOnce(null);

      const result = await service.getCollaborationIdForCalendar('calendar-1');

      expect(result).toBe('');
    });
  });

  describe('getSpaceIdForCalendar', () => {
    it('should return the space ID when the full chain resolves successfully', async () => {
      // Call chain: Timeline -> Collaboration -> Space
      entityManager.findOne
        .mockResolvedValueOnce({ id: 'timeline-1' }) // getTimelineIdForCalendar
        .mockResolvedValueOnce({ id: 'collab-1' }) // getCollaborationIdForCalendar
        .mockResolvedValueOnce({ id: 'space-1' }); // getSpaceIdForCalendar

      const result = await service.getSpaceIdForCalendar('calendar-1');

      expect(result).toBe('space-1');
    });

    it('should throw EntityNotFoundError when no space is found for the collaboration', async () => {
      // Timeline and Collaboration found, but Space not found
      entityManager.findOne
        .mockResolvedValueOnce({ id: 'timeline-1' })
        .mockResolvedValueOnce({ id: 'collab-1' })
        .mockResolvedValueOnce(null);

      await expect(service.getSpaceIdForCalendar('calendar-1')).rejects.toThrow(
        EntityNotFoundError
      );
    });

    it('should throw EntityNotFoundError when collaboration resolves to empty string (timeline not found)', async () => {
      // No timeline found -> collaborationID is '' -> Space query with empty ID -> no space
      entityManager.findOne.mockResolvedValue(null);

      await expect(service.getSpaceIdForCalendar('calendar-1')).rejects.toThrow(
        EntityNotFoundError
      );
    });
  });
});
