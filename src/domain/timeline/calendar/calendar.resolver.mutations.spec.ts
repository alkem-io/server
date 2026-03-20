import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ICalendarEvent } from '@domain/timeline/event/event.interface';
import { CalendarEventService } from '@domain/timeline/event/event.service';
import { CalendarEventAuthorizationService } from '@domain/timeline/event/event.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationSpaceAdapter } from '@services/adapters/notification-adapter/notification.space.adapter';
import { TimelineResolverService } from '@services/infrastructure/entity-resolver/timeline.resolver.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked, vi } from 'vitest';
import { ICalendar } from './calendar.interface';
import { CalendarResolverMutations } from './calendar.resolver.mutations';
import { CalendarService } from './calendar.service';

describe('CalendarResolverMutations', () => {
  let resolver: CalendarResolverMutations;
  let authorizationService: Mocked<AuthorizationService>;
  let authorizationPolicyService: Mocked<AuthorizationPolicyService>;
  let calendarService: Mocked<CalendarService>;
  let calendarEventService: Mocked<CalendarEventService>;
  let calendarEventAuthorizationService: Mocked<CalendarEventAuthorizationService>;
  let notificationSpaceAdapter: Mocked<NotificationSpaceAdapter>;
  let timelineResolverService: Mocked<TimelineResolverService>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<CalendarResolverMutations>(CalendarResolverMutations);
    authorizationService = module.get(
      AuthorizationService
    ) as Mocked<AuthorizationService>;
    authorizationPolicyService = module.get(
      AuthorizationPolicyService
    ) as Mocked<AuthorizationPolicyService>;
    calendarService = module.get(CalendarService) as Mocked<CalendarService>;
    calendarEventService = module.get(
      CalendarEventService
    ) as Mocked<CalendarEventService>;
    calendarEventAuthorizationService = module.get(
      CalendarEventAuthorizationService
    ) as Mocked<CalendarEventAuthorizationService>;
    notificationSpaceAdapter = module.get(
      NotificationSpaceAdapter
    ) as Mocked<NotificationSpaceAdapter>;
    timelineResolverService = module.get(
      TimelineResolverService
    ) as Mocked<TimelineResolverService>;
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('createEventOnCalendar', () => {
    it('should create event, apply authorization, process activity, and send notification when space exists', async () => {
      // Arrange
      const actorContext = new ActorContext();
      actorContext.actorID = 'user-1';
      const calendarAuth = { id: 'calendar-auth' };
      const mockCalendar = {
        id: 'calendar-1',
        authorization: calendarAuth,
      } as unknown as ICalendar;
      const mockEvent = {
        id: 'event-1',
        profile: { displayName: 'Test Event' },
      } as unknown as ICalendarEvent;
      const finalEvent = {
        id: 'event-1',
        profile: { displayName: 'Test Event' },
      } as unknown as ICalendarEvent;
      const eventData = {
        calendarID: 'calendar-1',
        nameID: 'test',
        profileData: { displayName: 'Test Event' },
      } as unknown as Parameters<
        CalendarResolverMutations['createEventOnCalendar']
      >[1];

      calendarService.getCalendarOrFail.mockResolvedValue(mockCalendar);
      authorizationService.grantAccessOrFail.mockReset();
      calendarService.createCalendarEvent.mockResolvedValue(mockEvent);
      calendarEventService.save.mockResolvedValue(
        mockEvent as unknown as Awaited<
          ReturnType<CalendarEventService['save']>
        >
      );
      calendarEventAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        [
          { id: 'event-auth' } as unknown as Awaited<
            ReturnType<
              CalendarEventAuthorizationService['applyAuthorizationPolicy']
            >
          >[0],
        ]
      );
      authorizationPolicyService.saveAll.mockResolvedValue(undefined!);
      calendarService.processActivityCalendarEventCreated.mockResolvedValue(
        undefined!
      );
      timelineResolverService.getSpaceIdForCalendar.mockResolvedValue(
        'space-1'
      );
      notificationSpaceAdapter.spaceCommunityCalendarEventCreated = vi
        .fn()
        .mockResolvedValue(undefined);
      calendarEventService.getCalendarEventOrFail.mockResolvedValue(finalEvent);

      // Act
      const result = await resolver.createEventOnCalendar(
        actorContext,
        eventData
      );

      // Assert
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        calendarAuth,
        AuthorizationPrivilege.CREATE,
        `create calendarEvent on calendar: calendar-1`
      );
      expect(calendarService.createCalendarEvent).toHaveBeenCalledWith(
        eventData,
        'user-1'
      );
      expect(
        calendarService.processActivityCalendarEventCreated
      ).toHaveBeenCalled();
      expect(
        notificationSpaceAdapter.spaceCommunityCalendarEventCreated
      ).toHaveBeenCalled();
      expect(result).toBe(finalEvent);
    });

    it('should skip notification when space is not found', async () => {
      // Arrange
      const actorContext = new ActorContext();
      actorContext.actorID = 'user-1';
      const mockCalendar = {
        id: 'calendar-1',
        authorization: { id: 'auth-1' },
      } as unknown as ICalendar;
      const mockEvent = {
        id: 'event-1',
        profile: { displayName: 'Test Event' },
      } as unknown as ICalendarEvent;
      const eventData = {
        calendarID: 'calendar-1',
        nameID: 'test',
      } as unknown as Parameters<
        CalendarResolverMutations['createEventOnCalendar']
      >[1];

      calendarService.getCalendarOrFail.mockResolvedValue(mockCalendar);
      authorizationService.grantAccessOrFail.mockReset();
      calendarService.createCalendarEvent.mockResolvedValue(mockEvent);
      calendarEventService.save.mockResolvedValue(
        mockEvent as unknown as Awaited<
          ReturnType<CalendarEventService['save']>
        >
      );
      calendarEventAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );
      authorizationPolicyService.saveAll.mockResolvedValue(undefined!);
      calendarService.processActivityCalendarEventCreated.mockResolvedValue(
        undefined!
      );
      timelineResolverService.getSpaceIdForCalendar.mockResolvedValue(
        null as unknown as string
      );
      calendarEventService.getCalendarEventOrFail.mockResolvedValue(mockEvent);

      // Act
      await resolver.createEventOnCalendar(actorContext, eventData);

      // Assert
      expect(
        notificationSpaceAdapter.spaceCommunityCalendarEventCreated
      ).not.toHaveBeenCalled();
    });
  });
});
