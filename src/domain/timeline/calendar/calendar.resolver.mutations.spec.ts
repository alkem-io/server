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
import { vi } from 'vitest';
import { ICalendar } from './calendar.interface';
import { CalendarResolverMutations } from './calendar.resolver.mutations';
import { CalendarService } from './calendar.service';

describe('CalendarResolverMutations', () => {
  let resolver: CalendarResolverMutations;
  let authorizationService: AuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let calendarService: CalendarService;
  let calendarEventService: CalendarEventService;
  let calendarEventAuthorizationService: CalendarEventAuthorizationService;
  let notificationSpaceAdapter: NotificationSpaceAdapter;
  let timelineResolverService: TimelineResolverService;

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
    authorizationService =
      module.get<AuthorizationService>(AuthorizationService);
    authorizationPolicyService = module.get<AuthorizationPolicyService>(
      AuthorizationPolicyService
    );
    calendarService = module.get<CalendarService>(CalendarService);
    calendarEventService =
      module.get<CalendarEventService>(CalendarEventService);
    calendarEventAuthorizationService =
      module.get<CalendarEventAuthorizationService>(
        CalendarEventAuthorizationService
      );
    notificationSpaceAdapter = module.get<NotificationSpaceAdapter>(
      NotificationSpaceAdapter
    );
    timelineResolverService = module.get<TimelineResolverService>(
      TimelineResolverService
    );
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
      } as any;

      calendarService.getCalendarOrFail.mockResolvedValue(mockCalendar);
      authorizationService.grantAccessOrFail.mockReset();
      calendarService.createCalendarEvent.mockResolvedValue(mockEvent);
      calendarEventService.save.mockResolvedValue(mockEvent);
      calendarEventAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([{ id: 'event-auth' }]);
      authorizationPolicyService.saveAll.mockResolvedValue(undefined);
      calendarService.processActivityCalendarEventCreated.mockResolvedValue(undefined);
      timelineResolverService.getSpaceIdForCalendar.mockResolvedValue('space-1');
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
      } as any;

      calendarService.getCalendarOrFail.mockResolvedValue(mockCalendar);
      authorizationService.grantAccessOrFail.mockReset();
      calendarService.createCalendarEvent.mockResolvedValue(mockEvent);
      calendarEventService.save.mockResolvedValue(mockEvent);
      calendarEventAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([]);
      authorizationPolicyService.saveAll.mockResolvedValue(undefined);
      calendarService.processActivityCalendarEventCreated.mockResolvedValue(undefined);
      timelineResolverService.getSpaceIdForCalendar.mockResolvedValue(null);
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
