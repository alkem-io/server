import { ActorContext } from '@core/actor-context/actor.context';
import { SpaceSettingsService } from '@domain/space/space.settings/space.settings.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { ICalendarEvent } from '../event/event.interface';
import { ICalendar } from './calendar.interface';
import { CalendarResolverFields } from './calendar.resolver.fields';
import { CalendarService } from './calendar.service';

describe('CalendarResolverFields', () => {
  let resolver: CalendarResolverFields;
  let calendarService: CalendarService;
  let _spaceSettingsService: SpaceSettingsService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarResolverFields,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<CalendarResolverFields>(CalendarResolverFields);
    calendarService = module.get<CalendarService>(CalendarService);
    _spaceSettingsService =
      module.get<SpaceSettingsService>(SpaceSettingsService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('event', () => {
    it('should return the calendar event when given a valid ID', async () => {
      // Arrange
      const mockCalendar = { id: 'calendar-1' } as ICalendar;
      const mockEvent = { id: 'event-1' } as unknown as ICalendarEvent;
      const mockActorContext = new ActorContext();

      calendarService.getCalendarEvent.mockResolvedValue(mockEvent);

      // Act
      const result = await resolver.event(
        mockCalendar,
        mockActorContext,
        'event-1'
      );

      // Assert
      expect(result).toBe(mockEvent);
      expect(calendarService.getCalendarEvent).toHaveBeenCalledWith(
        'calendar-1',
        'event-1'
      );
    });
  });

  describe('events', () => {
    it('should return events with subspace bubbling when space settings allow it', async () => {
      // Arrange
      const mockCalendar = { id: 'calendar-1' } as ICalendar;
      const mockActorContext = new ActorContext();
      const mockEvents = [
        { id: 'event-1' },
        { id: 'event-2' },
      ] as unknown as ICalendarEvent[];
      const mockSpace = {
        id: 'space-1',
        settings: {
          collaboration: {
            allowEventsFromSubspaces: true,
          },
        },
      };

      calendarService.getSpaceFromCalendarOrFail.mockResolvedValue(mockSpace);
      calendarService.getCalendarEvents.mockResolvedValue(mockEvents);

      // Act
      const result = await resolver.events(mockCalendar, mockActorContext);

      // Assert
      expect(result).toBe(mockEvents);
      expect(calendarService.getSpaceFromCalendarOrFail).toHaveBeenCalledWith(
        'calendar-1'
      );
      expect(calendarService.getCalendarEvents).toHaveBeenCalledWith(
        mockCalendar,
        mockActorContext,
        'space-1'
      );
    });

    it('should return events without subspace bubbling when space settings disallow it', async () => {
      // Arrange
      const mockCalendar = { id: 'calendar-1' } as ICalendar;
      const mockActorContext = new ActorContext();
      const mockEvents = [{ id: 'event-1' }] as unknown as ICalendarEvent[];
      const mockSpace = {
        id: 'space-1',
        settings: {
          collaboration: {
            allowEventsFromSubspaces: false,
          },
        },
      };

      calendarService.getSpaceFromCalendarOrFail.mockResolvedValue(mockSpace);
      calendarService.getCalendarEvents.mockResolvedValue(mockEvents);

      // Act
      const result = await resolver.events(mockCalendar, mockActorContext);

      // Assert
      expect(result).toBe(mockEvents);
      expect(calendarService.getCalendarEvents).toHaveBeenCalledWith(
        mockCalendar,
        mockActorContext,
        undefined
      );
    });
  });
});
