import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { ICalendarEvent } from './event.interface';
import { CalendarEventResolverMutations } from './event.resolver.mutations';
import { CalendarEventService } from './event.service';

describe('CalendarEventResolverMutations', () => {
  let resolver: CalendarEventResolverMutations;
  let authorizationService: AuthorizationService;
  let calendarEventService: CalendarEventService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarEventResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(CalendarEventResolverMutations);
    authorizationService =
      module.get<AuthorizationService>(AuthorizationService);
    calendarEventService =
      module.get<CalendarEventService>(CalendarEventService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('deleteCalendarEvent', () => {
    it('should check DELETE authorization and delete the event when access is granted', async () => {
      // Arrange
      const actorContext = new ActorContext();
      actorContext.actorID = 'user-1';
      const eventAuth = { id: 'event-auth' };
      const mockEvent = {
        id: 'event-1',
        authorization: eventAuth,
      } as unknown as ICalendarEvent;
      const deletedEvent = {
        id: 'event-1',
      } as unknown as ICalendarEvent;

      calendarEventService.getCalendarEventOrFail = vi
        .fn()
        .mockResolvedValue(mockEvent);
      authorizationService.grantAccessOrFail = vi.fn();
      calendarEventService.deleteCalendarEvent = vi
        .fn()
        .mockResolvedValue(deletedEvent);

      const deleteData = { ID: 'event-1' };

      // Act
      const result = await resolver.deleteCalendarEvent(
        actorContext,
        deleteData as any
      );

      // Assert
      expect(calendarEventService.getCalendarEventOrFail).toHaveBeenCalledWith(
        'event-1'
      );
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        eventAuth,
        AuthorizationPrivilege.DELETE,
        `delete calendarEvent: event-1`
      );
      expect(calendarEventService.deleteCalendarEvent).toHaveBeenCalledWith(
        deleteData
      );
      expect(result).toBe(deletedEvent);
    });
  });

  describe('updateCalendarEvent', () => {
    it('should check UPDATE authorization and update the event when access is granted', async () => {
      // Arrange
      const actorContext = new ActorContext();
      actorContext.actorID = 'user-1';
      const eventAuth = { id: 'event-auth' };
      const mockEvent = {
        id: 'event-1',
        authorization: eventAuth,
      } as unknown as ICalendarEvent;
      const updatedEvent = {
        id: 'event-1',
        wholeDay: true,
      } as unknown as ICalendarEvent;

      calendarEventService.getCalendarEventOrFail = vi
        .fn()
        .mockResolvedValue(mockEvent);
      authorizationService.grantAccessOrFail = vi.fn();
      calendarEventService.updateCalendarEvent = vi
        .fn()
        .mockResolvedValue(updatedEvent);

      const eventData = { ID: 'event-1', wholeDay: true } as any;

      // Act
      const result = await resolver.updateCalendarEvent(
        actorContext,
        eventData
      );

      // Assert
      expect(calendarEventService.getCalendarEventOrFail).toHaveBeenCalledWith(
        'event-1'
      );
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        eventAuth,
        AuthorizationPrivilege.UPDATE,
        `update calendarEvent: event-1`
      );
      expect(calendarEventService.updateCalendarEvent).toHaveBeenCalledWith(
        eventData
      );
      expect(result).toBe(updatedEvent);
    });
  });
});
