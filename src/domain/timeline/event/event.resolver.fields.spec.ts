import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { ISpace } from '@domain/space/space/space.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { ICalendarEvent } from './event.interface';
import { CalendarEventResolverFields } from './event.resolver.fields';
import { CalendarEventService } from './event.service';

describe('CalendarEventResolverFields', () => {
  let resolver: CalendarEventResolverFields;
  let calendarEventService: CalendarEventService;
  let userLookupService: UserLookupService;
  let urlGeneratorService: UrlGeneratorService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarEventResolverFields,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<CalendarEventResolverFields>(
      CalendarEventResolverFields
    );
    calendarEventService =
      module.get<CalendarEventService>(CalendarEventService);
    userLookupService = module.get<UserLookupService>(UserLookupService);
    urlGeneratorService = module.get<UrlGeneratorService>(UrlGeneratorService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('createdBy', () => {
    it('should return the user when createdBy resolves successfully', async () => {
      // Arrange
      const mockUser = { id: 'user-1', displayName: 'Test User' };
      const mockEvent = {
        id: 'event-1',
        createdBy: 'user-1',
      } as unknown as ICalendarEvent;

      userLookupService.getUserById.mockResolvedValue(mockUser);

      // Act
      const result = await resolver.createdBy(mockEvent);

      // Assert
      expect(result).toBe(mockUser);
      expect(userLookupService.getUserById).toHaveBeenCalledWith('user-1');
    });

    it('should return null when createdBy is falsy', async () => {
      // Arrange
      const mockEvent = {
        id: 'event-1',
        createdBy: '',
      } as unknown as ICalendarEvent;

      // Act
      const result = await resolver.createdBy(mockEvent);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when createdBy is undefined', async () => {
      // Arrange
      const mockEvent = {
        id: 'event-1',
        createdBy: undefined,
      } as unknown as ICalendarEvent;

      // Act
      const result = await resolver.createdBy(mockEvent);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null and log warning when user is not found (EntityNotFoundException)', async () => {
      // Arrange
      const mockEvent = {
        id: 'event-1',
        createdBy: 'deleted-user-id',
      } as unknown as ICalendarEvent;

      userLookupService.getUserById.mockRejectedValue(
          new EntityNotFoundException('User not found', LogContext.CALENDAR)
        );

      // Act
      const result = await resolver.createdBy(mockEvent);

      // Assert
      expect(result).toBeNull();
    });

    it('should rethrow non-EntityNotFoundException errors', async () => {
      // Arrange
      const mockEvent = {
        id: 'event-1',
        createdBy: 'user-1',
      } as unknown as ICalendarEvent;

      userLookupService.getUserById.mockRejectedValue(new Error('Unexpected error'));

      // Act & Assert
      await expect(resolver.createdBy(mockEvent)).rejects.toThrow(
        'Unexpected error'
      );
    });
  });

  describe('profile', () => {
    it('should return the profile when calendar event has one', async () => {
      // Arrange
      const mockProfile = { id: 'profile-1', displayName: 'Test' };
      const mockEvent = { id: 'event-1' } as unknown as ICalendarEvent;

      calendarEventService.getProfileOrFail.mockResolvedValue(mockProfile);

      // Act
      const result = await resolver.profile(mockEvent);

      // Assert
      expect(result).toBe(mockProfile);
      expect(calendarEventService.getProfileOrFail).toHaveBeenCalledWith(
        mockEvent
      );
    });
  });

  describe('startDate', () => {
    it('should return the event start date', () => {
      // Arrange
      const startDate = new Date('2026-03-15T10:00:00Z');
      const mockEvent = {
        id: 'event-1',
        startDate,
      } as unknown as ICalendarEvent;

      // Act
      const result = resolver.startDate(mockEvent);

      // Assert
      expect(result).toBe(startDate);
    });
  });

  describe('subspace', () => {
    it('should return the subspace when event has one', async () => {
      // Arrange
      const mockSpace = { id: 'space-1' } as unknown as ISpace;
      const mockEvent = { id: 'event-1' } as unknown as ICalendarEvent;

      calendarEventService.getSubspace.mockResolvedValue(mockSpace);

      // Act
      const result = await resolver.subspace(mockEvent);

      // Assert
      expect(result).toBe(mockSpace);
      expect(calendarEventService.getSubspace).toHaveBeenCalledWith(mockEvent);
    });

    it('should return undefined when event has no subspace', async () => {
      // Arrange
      const mockEvent = { id: 'event-1' } as unknown as ICalendarEvent;

      calendarEventService.getSubspace.mockResolvedValue(undefined);

      // Act
      const result = await resolver.subspace(mockEvent);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('googleCalendarUrl', () => {
    it('should return a google calendar URL', async () => {
      // Arrange
      const mockEvent = {
        id: 'event-1',
        startDate: new Date('2026-03-15T10:00:00Z'),
        durationMinutes: 60,
        wholeDay: false,
      } as unknown as ICalendarEvent;

      const mockProfile = {
        id: 'profile-1',
        displayName: 'Test Event',
        description: 'Description',
        location: undefined,
      };

      urlGeneratorService.getCalendarEventUrlPath.mockResolvedValue('https://alkem.io/events/event-1');
      urlGeneratorService.getCalendarEventIcsRestUrl.mockReturnValue('https://alkem.io/api/rest/calendar/event-1/ics');
      calendarEventService.getProfileOrFail.mockResolvedValue(mockProfile);

      // Act
      const result = await resolver.googleCalendarUrl(mockEvent);

      // Assert
      expect(result).toContain('calendar.google.com');
      expect(result).toContain('Test%20Event');
    });
  });

  describe('outlookCalendarUrl', () => {
    it('should return an outlook calendar URL', async () => {
      // Arrange
      const mockEvent = {
        id: 'event-1',
        startDate: new Date('2026-03-15T10:00:00Z'),
        durationMinutes: 60,
        wholeDay: false,
      } as unknown as ICalendarEvent;

      const mockProfile = {
        id: 'profile-1',
        displayName: 'Test Event',
        description: 'Description',
        location: undefined,
      };

      urlGeneratorService.getCalendarEventUrlPath.mockResolvedValue('https://alkem.io/events/event-1');
      urlGeneratorService.getCalendarEventIcsRestUrl.mockReturnValue('https://alkem.io/api/rest/calendar/event-1/ics');
      calendarEventService.getProfileOrFail.mockResolvedValue(mockProfile);

      // Act
      const result = await resolver.outlookCalendarUrl(mockEvent);

      // Assert
      expect(result).toContain('outlook.office.com');
      expect(result).toContain('Test%20Event');
    });
  });

  describe('icsDownloadUrl', () => {
    it('should return the ICS REST URL', async () => {
      // Arrange
      const icsUrl = 'https://alkem.io/api/rest/calendar/event-1/ics';
      const mockEvent = {
        id: 'event-1',
        startDate: new Date('2026-03-15T10:00:00Z'),
        durationMinutes: 60,
        wholeDay: false,
      } as unknown as ICalendarEvent;

      const mockProfile = {
        id: 'profile-1',
        displayName: 'Test Event',
        description: 'Description',
        location: undefined,
      };

      urlGeneratorService.getCalendarEventUrlPath.mockResolvedValue('https://alkem.io/events/event-1');
      urlGeneratorService.getCalendarEventIcsRestUrl.mockReturnValue(icsUrl);
      calendarEventService.getProfileOrFail.mockResolvedValue(mockProfile);

      // Act
      const result = await resolver.icsDownloadUrl(mockEvent);

      // Assert
      expect(result).toBe(icsUrl);
    });
  });
});
