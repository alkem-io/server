import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { ValidationException } from '@common/exceptions/validation.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ICalendarEvent } from '@domain/timeline/event/event.interface';
import { CalendarEventService } from '@domain/timeline/event/event.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { TimelineResolverService } from '@services/infrastructure/entity-resolver/timeline.resolver.service';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { vi } from 'vitest';
import { Calendar } from './calendar.entity';
import { ICalendar } from './calendar.interface';
import { CalendarService } from './calendar.service';
import { CreateCalendarEventOnCalendarInput } from './dto/calendar.dto.create.event';

describe('CalendarService', () => {
  let service: CalendarService;
  let calendarRepository: Repository<Calendar>;
  let calendarEventService: CalendarEventService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let authorizationService: AuthorizationService;
  let namingService: NamingService;
  let activityAdapter: ActivityAdapter;
  let contributionReporter: ContributionReporterService;
  let storageAggregatorResolverService: StorageAggregatorResolverService;
  let timelineResolverService: TimelineResolverService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        MockCacheManager,
        MockWinstonProvider,
        repositoryProviderMockFactory(Calendar),
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<CalendarService>(CalendarService);
    calendarRepository = module.get<Repository<Calendar>>(
      getRepositoryToken(Calendar)
    );
    calendarEventService =
      module.get<CalendarEventService>(CalendarEventService);
    authorizationPolicyService = module.get<AuthorizationPolicyService>(
      AuthorizationPolicyService
    );
    authorizationService =
      module.get<AuthorizationService>(AuthorizationService);
    namingService = module.get<NamingService>(NamingService);
    activityAdapter = module.get<ActivityAdapter>(ActivityAdapter);
    contributionReporter = module.get<ContributionReporterService>(
      ContributionReporterService
    );
    storageAggregatorResolverService =
      module.get<StorageAggregatorResolverService>(
        StorageAggregatorResolverService
      );
    timelineResolverService = module.get<TimelineResolverService>(
      TimelineResolverService
    );
  });

  describe('createCalendar', () => {
    it('should return a calendar with a CALENDAR authorization policy and empty events when called', () => {
      // Act
      const result = service.createCalendar();

      // Assert
      expect(result).toBeDefined();
      expect(result.authorization).toBeInstanceOf(AuthorizationPolicy);
      expect(result.authorization?.type).toBe(AuthorizationPolicyType.CALENDAR);
      expect(result.events).toEqual([]);
    });
  });

  describe('deleteCalendar', () => {
    it('should delete authorization policy and all events when calendar has both', async () => {
      // Arrange
      const calendarId = 'calendar-1';
      const mockAuthorization = { id: 'auth-1' } as AuthorizationPolicy;
      const mockEvents = [
        { id: 'event-1' } as ICalendarEvent,
        { id: 'event-2' } as ICalendarEvent,
      ];
      const mockCalendar = {
        id: calendarId,
        authorization: mockAuthorization,
        events: mockEvents,
      } as unknown as Calendar;

      vi.spyOn(calendarRepository, 'findOne').mockResolvedValue(mockCalendar);
      vi.spyOn(calendarRepository, 'remove').mockResolvedValue(mockCalendar);
      authorizationPolicyService.delete = vi.fn().mockResolvedValue(undefined);
      calendarEventService.deleteCalendarEvent = vi
        .fn()
        .mockResolvedValue(undefined);

      // Act
      await service.deleteCalendar(calendarId);

      // Assert
      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        mockAuthorization
      );
      expect(calendarEventService.deleteCalendarEvent).toHaveBeenCalledTimes(2);
      expect(calendarEventService.deleteCalendarEvent).toHaveBeenCalledWith({
        ID: 'event-1',
      });
      expect(calendarEventService.deleteCalendarEvent).toHaveBeenCalledWith({
        ID: 'event-2',
      });
      expect(calendarRepository.remove).toHaveBeenCalledWith(mockCalendar);
    });

    it('should skip authorization deletion when calendar has no authorization', async () => {
      // Arrange
      const calendarId = 'calendar-2';
      const mockCalendar = {
        id: calendarId,
        authorization: undefined,
        events: [],
      } as unknown as Calendar;

      vi.spyOn(calendarRepository, 'findOne').mockResolvedValue(mockCalendar);
      vi.spyOn(calendarRepository, 'remove').mockResolvedValue(mockCalendar);
      authorizationPolicyService.delete = vi.fn();

      // Act
      await service.deleteCalendar(calendarId);

      // Assert
      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
    });

    it('should skip event deletion when calendar has no events', async () => {
      // Arrange
      const calendarId = 'calendar-3';
      const mockCalendar = {
        id: calendarId,
        authorization: { id: 'auth-1' },
        events: undefined,
      } as unknown as Calendar;

      vi.spyOn(calendarRepository, 'findOne').mockResolvedValue(mockCalendar);
      vi.spyOn(calendarRepository, 'remove').mockResolvedValue(mockCalendar);
      authorizationPolicyService.delete = vi.fn().mockResolvedValue(undefined);
      calendarEventService.deleteCalendarEvent = vi.fn();

      // Act
      await service.deleteCalendar(calendarId);

      // Assert
      expect(calendarEventService.deleteCalendarEvent).not.toHaveBeenCalled();
    });

    it('should throw EntityNotFoundException when calendar does not exist', async () => {
      // Arrange
      vi.spyOn(calendarRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteCalendar('non-existent-id')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getCalendarOrFail', () => {
    it('should return the calendar when it exists', async () => {
      // Arrange
      const calendarId = 'calendar-1';
      const mockCalendar = { id: calendarId } as Calendar;
      vi.spyOn(calendarRepository, 'findOne').mockResolvedValue(mockCalendar);

      // Act
      const result = await service.getCalendarOrFail(calendarId);

      // Assert
      expect(result).toBe(mockCalendar);
      expect(calendarRepository.findOne).toHaveBeenCalledWith({
        where: { id: calendarId },
      });
    });

    it('should pass additional options to the repository when provided', async () => {
      // Arrange
      const calendarId = 'calendar-1';
      const options = { relations: { events: true } };
      const mockCalendar = {
        id: calendarId,
        events: [],
      } as unknown as Calendar;
      vi.spyOn(calendarRepository, 'findOne').mockResolvedValue(mockCalendar);

      // Act
      const result = await service.getCalendarOrFail(calendarId, options);

      // Assert
      expect(result).toBe(mockCalendar);
      expect(calendarRepository.findOne).toHaveBeenCalledWith({
        where: { id: calendarId },
        ...options,
      });
    });

    it('should throw EntityNotFoundException when calendar does not exist', async () => {
      // Arrange
      vi.spyOn(calendarRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getCalendarOrFail('non-existent-id')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('createCalendarEvent', () => {
    const buildCreateInput = (
      overrides?: Partial<CreateCalendarEventOnCalendarInput>
    ): CreateCalendarEventOnCalendarInput =>
      ({
        calendarID: 'calendar-1',
        nameID: '',
        profileData: { displayName: 'Test Event' },
        type: 'event',
        tags: ['tag1'],
        startDate: new Date('2025-06-15'),
        wholeDay: false,
        multipleDays: false,
        durationMinutes: 60,
        durationDays: 0,
        visibleOnParentCalendar: true,
        ...overrides,
      }) as CreateCalendarEventOnCalendarInput;

    it('should create a calendar event and associate it with the calendar when nameID is auto-generated', async () => {
      // Arrange
      const input = buildCreateInput({ nameID: '' });
      const mockCalendar = { id: 'calendar-1' } as Calendar;
      const mockStorageAggregator = { id: 'storage-1' } as any;
      const mockEvent = {
        id: 'event-1',
        nameID: 'test-event',
      } as unknown as ICalendarEvent;
      const savedEvent = {
        ...mockEvent,
        calendar: mockCalendar,
      } as unknown as ICalendarEvent;

      vi.spyOn(calendarRepository, 'findOne').mockResolvedValue(mockCalendar);
      namingService.getReservedNameIDsInCalendar = vi
        .fn()
        .mockResolvedValue([]);
      namingService.createNameIdAvoidingReservedNameIDs = vi
        .fn()
        .mockReturnValue('test-event');
      storageAggregatorResolverService.getStorageAggregatorForCalendar = vi
        .fn()
        .mockResolvedValue(mockStorageAggregator);
      calendarEventService.createCalendarEvent = vi
        .fn()
        .mockResolvedValue(mockEvent);
      calendarEventService.save = vi.fn().mockResolvedValue(savedEvent);

      // Act
      const _result = await service.createCalendarEvent(input, 'user-1');

      // Assert
      expect(
        namingService.createNameIdAvoidingReservedNameIDs
      ).toHaveBeenCalledWith('Test Event', []);
      expect(calendarEventService.createCalendarEvent).toHaveBeenCalledWith(
        input,
        mockStorageAggregator,
        'user-1'
      );
      expect(mockEvent.calendar).toBe(mockCalendar);
      expect(calendarEventService.save).toHaveBeenCalledWith(mockEvent);
    });

    it('should use the provided nameID when it is not already taken', async () => {
      // Arrange
      const input = buildCreateInput({ nameID: 'custom-name-id' });
      const mockCalendar = { id: 'calendar-1' } as Calendar;
      const mockStorageAggregator = { id: 'storage-1' } as any;
      const mockEvent = {
        id: 'event-1',
        nameID: 'custom-name-id',
      } as unknown as ICalendarEvent;

      vi.spyOn(calendarRepository, 'findOne').mockResolvedValue(mockCalendar);
      namingService.getReservedNameIDsInCalendar = vi
        .fn()
        .mockResolvedValue(['other-name']);
      namingService.createNameIdAvoidingReservedNameIDs = vi.fn();
      storageAggregatorResolverService.getStorageAggregatorForCalendar = vi
        .fn()
        .mockResolvedValue(mockStorageAggregator);
      calendarEventService.createCalendarEvent = vi
        .fn()
        .mockResolvedValue(mockEvent);
      calendarEventService.save = vi.fn().mockResolvedValue(mockEvent);

      // Act
      await service.createCalendarEvent(input, 'user-1');

      // Assert
      expect(
        namingService.createNameIdAvoidingReservedNameIDs
      ).not.toHaveBeenCalled();
      expect(calendarEventService.createCalendarEvent).toHaveBeenCalledWith(
        expect.objectContaining({ nameID: 'custom-name-id' }),
        mockStorageAggregator,
        'user-1'
      );
    });

    it('should throw ValidationException when the provided nameID is already taken', async () => {
      // Arrange
      const input = buildCreateInput({ nameID: 'taken-name' });
      const mockCalendar = { id: 'calendar-1' } as Calendar;

      vi.spyOn(calendarRepository, 'findOne').mockResolvedValue(mockCalendar);
      namingService.getReservedNameIDsInCalendar = vi
        .fn()
        .mockResolvedValue(['taken-name', 'other-name']);

      // Act & Assert
      await expect(
        service.createCalendarEvent(input, 'user-1')
      ).rejects.toThrow(ValidationException);
    });

    it('should throw EntityNotFoundException when the calendar does not exist', async () => {
      // Arrange
      const input = buildCreateInput({ calendarID: 'non-existent-calendar' });
      vi.spyOn(calendarRepository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.createCalendarEvent(input, 'user-1')
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should resolve the storage aggregator for the calendar before creating the event', async () => {
      // Arrange
      const input = buildCreateInput({ nameID: 'test-event' });
      const mockCalendar = { id: 'calendar-1' } as Calendar;
      const mockStorageAggregator = { id: 'storage-1' } as any;
      const mockEvent = { id: 'event-1' } as unknown as ICalendarEvent;

      vi.spyOn(calendarRepository, 'findOne').mockResolvedValue(mockCalendar);
      namingService.getReservedNameIDsInCalendar = vi
        .fn()
        .mockResolvedValue([]);
      storageAggregatorResolverService.getStorageAggregatorForCalendar = vi
        .fn()
        .mockResolvedValue(mockStorageAggregator);
      calendarEventService.createCalendarEvent = vi
        .fn()
        .mockResolvedValue(mockEvent);
      calendarEventService.save = vi.fn().mockResolvedValue(mockEvent);

      // Act
      await service.createCalendarEvent(input, 'user-1');

      // Assert
      expect(
        storageAggregatorResolverService.getStorageAggregatorForCalendar
      ).toHaveBeenCalledWith('calendar-1');
    });
  });

  describe('getCalendarEvents', () => {
    const buildActorContext = (
      overrides?: Partial<ActorContext>
    ): ActorContext => {
      const actorContext = new ActorContext();
      actorContext.actorID = 'user-1';
      Object.assign(actorContext, overrides);
      return actorContext;
    };

    it('should return only events the agent has READ access to when no rootSpaceId is provided', async () => {
      // Arrange
      const calendarId = 'calendar-1';
      const actorContext = buildActorContext();
      const eventWithAccess = {
        id: 'event-1',
        authorization: { id: 'auth-1' },
      } as unknown as ICalendarEvent;
      const eventWithoutAccess = {
        id: 'event-2',
        authorization: { id: 'auth-2' },
      } as unknown as ICalendarEvent;
      const mockCalendar = {
        id: calendarId,
        events: [eventWithAccess, eventWithoutAccess],
      } as unknown as Calendar;

      vi.spyOn(calendarRepository, 'findOne').mockResolvedValue(mockCalendar);
      authorizationService.isAccessGranted = vi
        .fn()
        .mockImplementation(
          (_actorContext: ActorContext, authorization: AuthorizationPolicy) => {
            return authorization?.id === 'auth-1';
          }
        );

      const inputCalendar = { id: calendarId } as ICalendar;

      // Act
      const result = await service.getCalendarEvents(
        inputCalendar,
        actorContext
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(eventWithAccess);
      expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
        actorContext,
        eventWithAccess.authorization,
        AuthorizationPrivilege.READ
      );
    });

    it('should return empty array when agent has no READ access to any events', async () => {
      // Arrange
      const calendarId = 'calendar-1';
      const actorContext = buildActorContext();
      const mockCalendar = {
        id: calendarId,
        events: [
          { id: 'event-1', authorization: { id: 'auth-1' } },
          { id: 'event-2', authorization: { id: 'auth-2' } },
        ],
      } as unknown as Calendar;

      vi.spyOn(calendarRepository, 'findOne').mockResolvedValue(mockCalendar);
      authorizationService.isAccessGranted = vi.fn().mockReturnValue(false);

      const inputCalendar = { id: calendarId } as ICalendar;

      // Act
      const result = await service.getCalendarEvents(
        inputCalendar,
        actorContext
      );

      // Assert
      expect(result).toEqual([]);
    });

    it('should throw EntityNotFoundException when calendar events are not initialized', async () => {
      // Arrange
      const calendarId = 'calendar-1';
      const actorContext = buildActorContext();
      const mockCalendar = {
        id: calendarId,
        events: undefined,
      } as unknown as Calendar;

      vi.spyOn(calendarRepository, 'findOne').mockResolvedValue(mockCalendar);

      const inputCalendar = { id: calendarId } as ICalendar;

      // Act & Assert
      await expect(
        service.getCalendarEvents(inputCalendar, actorContext)
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should include subspace events when rootSpaceId is provided', async () => {
      // Arrange
      const calendarId = 'calendar-1';
      const rootSpaceId = 'space-root';
      const actorContext = buildActorContext();
      const calendarEvent = {
        id: 'event-1',
        authorization: { id: 'auth-1' },
      } as unknown as ICalendarEvent;
      const subspaceEvent = {
        id: 'subspace-event-1',
        authorization: { id: 'auth-sub' },
      } as unknown as ICalendarEvent;
      const mockCalendar = {
        id: calendarId,
        events: [calendarEvent],
      } as unknown as Calendar;

      vi.spyOn(calendarRepository, 'findOne').mockResolvedValue(mockCalendar);
      authorizationService.isAccessGranted = vi.fn().mockReturnValue(true);

      // Mock the subspace events retrieval
      vi.spyOn(
        service,
        'getCalendarEventsFromSubspaces' as any
      ).mockResolvedValue([subspaceEvent]);

      const inputCalendar = { id: calendarId } as ICalendar;

      // Act
      const result = await service.getCalendarEvents(
        inputCalendar,
        actorContext,
        rootSpaceId
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toContain(calendarEvent);
      expect(result).toContain(subspaceEvent);
    });

    it('should not fetch subspace events when rootSpaceId is not provided', async () => {
      // Arrange
      const calendarId = 'calendar-1';
      const actorContext = buildActorContext();
      const mockCalendar = {
        id: calendarId,
        events: [],
      } as unknown as Calendar;

      vi.spyOn(calendarRepository, 'findOne').mockResolvedValue(mockCalendar);
      const getSubspaceEventsSpy = vi.spyOn(
        service,
        'getCalendarEventsFromSubspaces' as any
      );

      const inputCalendar = { id: calendarId } as ICalendar;

      // Act
      await service.getCalendarEvents(inputCalendar, actorContext);

      // Assert
      expect(getSubspaceEventsSpy).not.toHaveBeenCalled();
    });

    it('should throw EntityNotFoundException when calendar does not exist', async () => {
      // Arrange
      const actorContext = buildActorContext();
      vi.spyOn(calendarRepository, 'findOne').mockResolvedValue(null);

      const inputCalendar = { id: 'non-existent-id' } as ICalendar;

      // Act & Assert
      await expect(
        service.getCalendarEvents(inputCalendar, actorContext)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('processActivityCalendarEventCreated', () => {
    it('should emit activity event and report contribution when spaceID exists', async () => {
      // Arrange
      const actorContext = new ActorContext();
      actorContext.actorID = 'user-1';

      const mockCalendar = { id: 'calendar-1' } as ICalendar;
      const mockEvent = {
        id: 'event-1',
        profile: { displayName: 'Test Event' },
      } as unknown as ICalendarEvent;

      activityAdapter.calendarEventCreated = vi.fn();
      timelineResolverService.getSpaceIdForCalendar = vi
        .fn()
        .mockResolvedValue('space-1');
      contributionReporter.calendarEventCreated = vi.fn();

      // Act
      await service.processActivityCalendarEventCreated(
        mockCalendar,
        mockEvent,
        actorContext
      );

      // Assert
      expect(activityAdapter.calendarEventCreated).toHaveBeenCalledWith({
        triggeredBy: 'user-1',
        calendar: mockCalendar,
        calendarEvent: mockEvent,
      });
      expect(contributionReporter.calendarEventCreated).toHaveBeenCalledWith(
        {
          id: 'event-1',
          name: 'Test Event',
          space: 'space-1',
        },
        {
          id: 'user-1',
          email: 'user-1',
        }
      );
    });

    it('should emit activity event but skip contribution report when spaceID is null', async () => {
      // Arrange
      const actorContext = new ActorContext();
      actorContext.actorID = 'user-1';

      const mockCalendar = { id: 'calendar-1' } as ICalendar;
      const mockEvent = {
        id: 'event-1',
        profile: { displayName: 'Test Event' },
      } as unknown as ICalendarEvent;

      activityAdapter.calendarEventCreated = vi.fn();
      timelineResolverService.getSpaceIdForCalendar = vi
        .fn()
        .mockResolvedValue(null);
      contributionReporter.calendarEventCreated = vi.fn();

      // Act
      await service.processActivityCalendarEventCreated(
        mockCalendar,
        mockEvent,
        actorContext
      );

      // Assert
      expect(activityAdapter.calendarEventCreated).toHaveBeenCalled();
      expect(contributionReporter.calendarEventCreated).not.toHaveBeenCalled();
    });
  });
});
