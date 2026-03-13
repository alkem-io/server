import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { ValidationException } from '@common/exceptions/validation.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IProfile } from '@domain/common/profile';
import { ICalendarEvent } from '@domain/timeline/event/event.interface';
import { CalendarEventService } from '@domain/timeline/event/event.service';
import { Test, TestingModule } from '@nestjs/testing';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { vi } from 'vitest';
import { CalendarEventIcsService } from './calendar-event-ics.service';

describe('CalendarEventIcsService', () => {
  let service: CalendarEventIcsService;
  let calendarEventService: CalendarEventService;
  let authorizationService: AuthorizationService;
  let urlGeneratorService: UrlGeneratorService;

  const mockActorContext: ActorContext = {
    actorID: 'user-123',
  } as ActorContext;

  const mockProfile: IProfile = {
    id: 'profile-123',
    displayName: 'Team Meeting',
    description: 'Quarterly planning session',
    location: {
      city: 'Amsterdam',
      country: 'Netherlands',
    },
  } as IProfile;

  const mockCalendarEvent: ICalendarEvent = {
    id: 'event-123',
    nameID: 'team-meeting-2026',
    startDate: new Date('2026-03-10T14:00:00Z'),
    wholeDay: false,
    durationMinutes: 60,
    authorization: {
      id: 'auth-123',
    },
    profile: mockProfile,
  } as ICalendarEvent;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarEventIcsService,
        MockWinstonProvider,
        {
          provide: CalendarEventService,
          useValue: {
            getCalendarEventOrFail: vi.fn(),
            getProfileOrFail: vi.fn(),
          },
        },
        {
          provide: AuthorizationService,
          useValue: {
            grantAccessOrFail: vi.fn(),
          },
        },
        {
          provide: UrlGeneratorService,
          useValue: {
            getCalendarEventUrlPath: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(CalendarEventIcsService);
    calendarEventService = module.get(CalendarEventService);
    authorizationService = module.get(AuthorizationService);
    urlGeneratorService = module.get(UrlGeneratorService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateIcs', () => {
    it('should generate ICS file successfully for a standard event', async () => {
      vi.spyOn(
        calendarEventService,
        'getCalendarEventOrFail'
      ).mockResolvedValue(mockCalendarEvent);
      vi.spyOn(authorizationService, 'grantAccessOrFail').mockReturnValue(true);
      vi.spyOn(
        urlGeneratorService,
        'getCalendarEventUrlPath'
      ).mockResolvedValue('https://alkem.io/event/event-123');
      vi.spyOn(calendarEventService, 'getProfileOrFail').mockResolvedValue(
        mockProfile
      );

      const result = await service.generateIcs('event-123', mockActorContext);

      expect(result).toBeDefined();
      expect(result.filename).toBe('team-meeting-2026.ics');
      expect(result.content).toContain('BEGIN:VCALENDAR');
      expect(result.content).toContain('VERSION:2.0');
      expect(result.content).toContain('SUMMARY:Team Meeting');
      expect(result.content).toContain(
        'DESCRIPTION:Quarterly planning session'
      );
      expect(result.content).toContain('LOCATION:');
      expect(result.content).toContain('URL:https://alkem.io/event/event-123');
      expect(result.content).toContain('END:VCALENDAR');
    });

    it('should generate ICS file for whole day event', async () => {
      const wholeDayEvent = {
        ...mockCalendarEvent,
        wholeDay: true,
        startDate: new Date('2026-03-10T00:00:00Z'),
      };

      vi.spyOn(
        calendarEventService,
        'getCalendarEventOrFail'
      ).mockResolvedValue(wholeDayEvent);
      vi.spyOn(authorizationService, 'grantAccessOrFail').mockReturnValue(true);
      vi.spyOn(
        urlGeneratorService,
        'getCalendarEventUrlPath'
      ).mockResolvedValue('https://alkem.io/event/event-123');
      vi.spyOn(calendarEventService, 'getProfileOrFail').mockResolvedValue(
        mockProfile
      );

      const result = await service.generateIcs('event-123', mockActorContext);

      expect(result.content).toContain('DTSTART');
      expect(result.content).toContain('DTEND');
    });

    it('should generate ICS file without description when not provided', async () => {
      const profileWithoutDescription = {
        ...mockProfile,
        description: undefined,
      };

      vi.spyOn(
        calendarEventService,
        'getCalendarEventOrFail'
      ).mockResolvedValue(mockCalendarEvent);
      vi.spyOn(authorizationService, 'grantAccessOrFail').mockReturnValue(true);
      vi.spyOn(
        urlGeneratorService,
        'getCalendarEventUrlPath'
      ).mockResolvedValue('https://alkem.io/event/event-123');
      vi.spyOn(calendarEventService, 'getProfileOrFail').mockResolvedValue(
        profileWithoutDescription
      );

      const result = await service.generateIcs('event-123', mockActorContext);

      expect(result.content).toContain('BEGIN:VCALENDAR');
      expect(result.content).not.toContain('DESCRIPTION:');
    });

    it('should generate ICS file without location when not provided', async () => {
      const profileWithoutLocation = {
        ...mockProfile,
        location: undefined,
      };

      vi.spyOn(
        calendarEventService,
        'getCalendarEventOrFail'
      ).mockResolvedValue(mockCalendarEvent);
      vi.spyOn(authorizationService, 'grantAccessOrFail').mockReturnValue(true);
      vi.spyOn(
        urlGeneratorService,
        'getCalendarEventUrlPath'
      ).mockResolvedValue('https://alkem.io/event/event-123');
      vi.spyOn(calendarEventService, 'getProfileOrFail').mockResolvedValue(
        profileWithoutLocation
      );

      const result = await service.generateIcs('event-123', mockActorContext);

      expect(result.content).toContain('BEGIN:VCALENDAR');
      expect(result.content).not.toContain('LOCATION:');
    });

    it('should call authorization service with correct parameters', async () => {
      const grantAccessSpy = vi
        .spyOn(authorizationService, 'grantAccessOrFail')
        .mockReturnValue(true);

      vi.spyOn(
        calendarEventService,
        'getCalendarEventOrFail'
      ).mockResolvedValue(mockCalendarEvent);
      vi.spyOn(
        urlGeneratorService,
        'getCalendarEventUrlPath'
      ).mockResolvedValue('https://alkem.io/event/event-123');
      vi.spyOn(calendarEventService, 'getProfileOrFail').mockResolvedValue(
        mockProfile
      );

      await service.generateIcs('event-123', mockActorContext);

      expect(grantAccessSpy).toHaveBeenCalledWith(
        mockActorContext,
        mockCalendarEvent.authorization,
        AuthorizationPrivilege.READ,
        'ics download for calendar event'
      );
    });

    it('should throw when user lacks READ permission', async () => {
      vi.spyOn(
        calendarEventService,
        'getCalendarEventOrFail'
      ).mockResolvedValue(mockCalendarEvent);
      vi.spyOn(authorizationService, 'grantAccessOrFail').mockImplementation(
        () => {
          throw new ForbiddenAuthorizationPolicyException(
            'Access denied',
            AuthorizationPrivilege.READ,
            'policy-1',
            'user-123'
          );
        }
      );

      await expect(
        service.generateIcs('event-123', mockActorContext)
      ).rejects.toThrow(ForbiddenAuthorizationPolicyException);
    });

    it('should retrieve calendar event with profile relations', async () => {
      const getCalendarEventSpy = vi
        .spyOn(calendarEventService, 'getCalendarEventOrFail')
        .mockResolvedValue(mockCalendarEvent);

      vi.spyOn(authorizationService, 'grantAccessOrFail').mockReturnValue(true);
      vi.spyOn(
        urlGeneratorService,
        'getCalendarEventUrlPath'
      ).mockResolvedValue('https://alkem.io/event/event-123');
      vi.spyOn(calendarEventService, 'getProfileOrFail').mockResolvedValue(
        mockProfile
      );

      await service.generateIcs('event-123', mockActorContext);

      expect(getCalendarEventSpy).toHaveBeenCalledWith('event-123', {
        relations: { profile: true },
      });
    });

    it('should generate correct filename based on event nameID', async () => {
      const eventWithCustomNameID = {
        ...mockCalendarEvent,
        nameID: 'custom-event-name',
      };

      vi.spyOn(
        calendarEventService,
        'getCalendarEventOrFail'
      ).mockResolvedValue(eventWithCustomNameID);
      vi.spyOn(authorizationService, 'grantAccessOrFail').mockReturnValue(true);
      vi.spyOn(
        urlGeneratorService,
        'getCalendarEventUrlPath'
      ).mockResolvedValue('https://alkem.io/event/event-123');
      vi.spyOn(calendarEventService, 'getProfileOrFail').mockResolvedValue(
        mockProfile
      );

      const result = await service.generateIcs('event-123', mockActorContext);

      expect(result.filename).toBe('custom-event-name.ics');
    });

    it('should include event URL in ICS content', async () => {
      const customUrl = 'https://alkem.io/spaces/space-1/events/event-123';

      vi.spyOn(
        calendarEventService,
        'getCalendarEventOrFail'
      ).mockResolvedValue(mockCalendarEvent);
      vi.spyOn(authorizationService, 'grantAccessOrFail').mockReturnValue(true);
      vi.spyOn(
        urlGeneratorService,
        'getCalendarEventUrlPath'
      ).mockResolvedValue(customUrl);
      vi.spyOn(calendarEventService, 'getProfileOrFail').mockResolvedValue(
        mockProfile
      );

      const result = await service.generateIcs('event-123', mockActorContext);

      expect(result.content).toContain(`URL:${customUrl}`);
    });

    it('should log verbose message on successful generation', async () => {
      const mockLogger = MockWinstonProvider.useValue;

      vi.spyOn(
        calendarEventService,
        'getCalendarEventOrFail'
      ).mockResolvedValue(mockCalendarEvent);
      vi.spyOn(authorizationService, 'grantAccessOrFail').mockReturnValue(true);
      vi.spyOn(
        urlGeneratorService,
        'getCalendarEventUrlPath'
      ).mockResolvedValue('https://alkem.io/event/event-123');
      vi.spyOn(calendarEventService, 'getProfileOrFail').mockResolvedValue(
        mockProfile
      );

      await service.generateIcs('event-123', mockActorContext);

      expect(mockLogger.verbose).toHaveBeenCalledWith(
        'ICS generated for calendar event event-123 by actor user-123',
        LogContext.CALENDAR
      );
    });

    it('should handle events with markdown description', async () => {
      const profileWithMarkdown = {
        ...mockProfile,
        description:
          '**Bold text** and *italic* with [link](https://example.com)',
      };

      vi.spyOn(
        calendarEventService,
        'getCalendarEventOrFail'
      ).mockResolvedValue(mockCalendarEvent);
      vi.spyOn(authorizationService, 'grantAccessOrFail').mockReturnValue(true);
      vi.spyOn(
        urlGeneratorService,
        'getCalendarEventUrlPath'
      ).mockResolvedValue('https://alkem.io/event/event-123');
      vi.spyOn(calendarEventService, 'getProfileOrFail').mockResolvedValue(
        profileWithMarkdown
      );

      const result = await service.generateIcs('event-123', mockActorContext);

      // Markdown should be converted to plain text
      expect(result.content).toContain('DESCRIPTION:');
      expect(result.content).not.toContain('**');
      expect(result.content).not.toContain('[link]');
    });

    it('should handle events with multi-day duration', async () => {
      const multiDayEvent = {
        ...mockCalendarEvent,
        startDate: new Date('2026-03-10T09:00:00Z'),
        durationMinutes: 2880, // 2 days
      };

      vi.spyOn(
        calendarEventService,
        'getCalendarEventOrFail'
      ).mockResolvedValue(multiDayEvent);
      vi.spyOn(authorizationService, 'grantAccessOrFail').mockReturnValue(true);
      vi.spyOn(
        urlGeneratorService,
        'getCalendarEventUrlPath'
      ).mockResolvedValue('https://alkem.io/event/event-123');
      vi.spyOn(calendarEventService, 'getProfileOrFail').mockResolvedValue(
        mockProfile
      );

      const result = await service.generateIcs('event-123', mockActorContext);

      expect(result.content).toContain('DTSTART');
      expect(result.content).toContain('DTEND');
    });

    it('should throw validation exception for zero-duration event', async () => {
      const zeroDurationEvent = {
        ...mockCalendarEvent,
        durationMinutes: 0,
        durationDays: 0,
      } as ICalendarEvent;

      vi.spyOn(
        calendarEventService,
        'getCalendarEventOrFail'
      ).mockResolvedValue(zeroDurationEvent);
      vi.spyOn(authorizationService, 'grantAccessOrFail').mockReturnValue(true);
      vi.spyOn(
        urlGeneratorService,
        'getCalendarEventUrlPath'
      ).mockResolvedValue('https://alkem.io/event/event-123');

      await expect(
        service.generateIcs('event-123', mockActorContext)
      ).rejects.toThrow(ValidationException);
    });

    it('should throw validation exception when startDate is missing', async () => {
      const eventWithMissingStartDate = {
        ...mockCalendarEvent,
        startDate: undefined,
      } as unknown as ICalendarEvent;

      vi.spyOn(
        calendarEventService,
        'getCalendarEventOrFail'
      ).mockResolvedValue(eventWithMissingStartDate);
      vi.spyOn(authorizationService, 'grantAccessOrFail').mockReturnValue(true);
      vi.spyOn(
        urlGeneratorService,
        'getCalendarEventUrlPath'
      ).mockResolvedValue('https://alkem.io/event/event-123');

      await expect(
        service.generateIcs('event-123', mockActorContext)
      ).rejects.toThrow(ValidationException);
    });

    it('should throw validation exception when startDate is invalid', async () => {
      const eventWithInvalidStartDate = {
        ...mockCalendarEvent,
        startDate: new Date('not-a-valid-date'),
      } as ICalendarEvent;

      vi.spyOn(
        calendarEventService,
        'getCalendarEventOrFail'
      ).mockResolvedValue(eventWithInvalidStartDate);
      vi.spyOn(authorizationService, 'grantAccessOrFail').mockReturnValue(true);
      vi.spyOn(
        urlGeneratorService,
        'getCalendarEventUrlPath'
      ).mockResolvedValue('https://alkem.io/event/event-123');

      await expect(
        service.generateIcs('event-123', mockActorContext)
      ).rejects.toThrow(ValidationException);
    });
  });
});
