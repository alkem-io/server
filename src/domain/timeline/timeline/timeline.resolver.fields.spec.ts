import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked, vi } from 'vitest';
import { ICalendar } from '../calendar/calendar.interface';
import { ITimeline } from './timeline.interface';
import { TimelineResolverFields } from './timeline.resolver.fields';
import { TimelineService } from './timeline.service';

describe('TimelineResolverFields', () => {
  let resolver: TimelineResolverFields;
  let timelineService: Mocked<TimelineService>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimelineResolverFields,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<TimelineResolverFields>(TimelineResolverFields);
    timelineService = module.get(TimelineService) as Mocked<TimelineService>;
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('calendar', () => {
    it('should return the calendar when timeline has a calendar', async () => {
      // Arrange
      const mockCalendar = {
        id: 'calendar-1',
        events: [],
      } as unknown as ICalendar;
      const mockTimeline = { id: 'timeline-1' } as ITimeline;

      timelineService.getCalendarOrFail.mockResolvedValue(mockCalendar);

      // Act
      const result = await resolver.calendar(mockTimeline);

      // Assert
      expect(result).toBe(mockCalendar);
      expect(timelineService.getCalendarOrFail).toHaveBeenCalledWith(
        mockTimeline
      );
    });
  });
});
