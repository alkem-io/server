import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CalendarEventAuthorizationService } from '@domain/timeline/event/event.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { ICalendar } from './calendar.interface';
import { CalendarService } from './calendar.service';
import { CalendarAuthorizationService } from './calendar.service.authorization';

describe('CalendarAuthorizationService', () => {
  let service: CalendarAuthorizationService;
  let calendarService: CalendarService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let calendarEventAuthorizationService: CalendarEventAuthorizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<CalendarAuthorizationService>(
      CalendarAuthorizationService
    );
    calendarService = module.get<CalendarService>(CalendarService);
    authorizationPolicyService = module.get<AuthorizationPolicyService>(
      AuthorizationPolicyService
    );
    calendarEventAuthorizationService =
      module.get<CalendarEventAuthorizationService>(
        CalendarEventAuthorizationService
      );
  });

  describe('applyAuthorizationPolicy', () => {
    it('should reset, inherit parent authorization, and cascade to events when calendar has events', async () => {
      // Arrange
      const parentAuth = { id: 'parent-auth' } as IAuthorizationPolicy;
      const calendarAuth = { id: 'calendar-auth' } as IAuthorizationPolicy;
      const resetAuth = { id: 'reset-auth' } as IAuthorizationPolicy;
      const inheritedAuth = { id: 'inherited-auth' } as IAuthorizationPolicy;
      const eventAuth = { id: 'event-auth' } as IAuthorizationPolicy;
      const mockEvent = { id: 'event-1' };
      const mockCalendar = {
        id: 'calendar-1',
        authorization: calendarAuth,
        events: [mockEvent],
      } as unknown as ICalendar;

      calendarService.getCalendarOrFail = vi
        .fn()
        .mockResolvedValue(mockCalendar);
      authorizationPolicyService.reset = vi.fn().mockReturnValue(resetAuth);
      authorizationPolicyService.inheritParentAuthorization = vi
        .fn()
        .mockReturnValue(inheritedAuth);
      calendarEventAuthorizationService.applyAuthorizationPolicy = vi
        .fn()
        .mockResolvedValue([eventAuth]);

      const inputCalendar = { id: 'calendar-1' } as ICalendar;

      // Act
      const result = await service.applyAuthorizationPolicy(
        inputCalendar,
        parentAuth
      );

      // Assert
      expect(authorizationPolicyService.reset).toHaveBeenCalledWith(
        calendarAuth
      );
      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(resetAuth, parentAuth);
      expect(
        calendarEventAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith(mockEvent, inheritedAuth);
      expect(result).toContain(inheritedAuth);
      expect(result).toContain(eventAuth);
    });

    it('should throw RelationshipNotFoundException when events are not loaded', async () => {
      // Arrange
      const parentAuth = { id: 'parent-auth' } as IAuthorizationPolicy;
      const mockCalendar = {
        id: 'calendar-1',
        authorization: { id: 'auth-1' },
        events: undefined,
      } as unknown as ICalendar;

      calendarService.getCalendarOrFail = vi
        .fn()
        .mockResolvedValue(mockCalendar);

      const inputCalendar = { id: 'calendar-1' } as ICalendar;

      // Act & Assert
      await expect(
        service.applyAuthorizationPolicy(inputCalendar, parentAuth)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should return only calendar authorization when calendar has no events', async () => {
      // Arrange
      const parentAuth = { id: 'parent-auth' } as IAuthorizationPolicy;
      const calendarAuth = { id: 'calendar-auth' } as IAuthorizationPolicy;
      const inheritedAuth = { id: 'inherited-auth' } as IAuthorizationPolicy;
      const mockCalendar = {
        id: 'calendar-1',
        authorization: calendarAuth,
        events: [],
      } as unknown as ICalendar;

      calendarService.getCalendarOrFail = vi
        .fn()
        .mockResolvedValue(mockCalendar);
      authorizationPolicyService.reset = vi.fn().mockReturnValue(calendarAuth);
      authorizationPolicyService.inheritParentAuthorization = vi
        .fn()
        .mockReturnValue(inheritedAuth);

      const inputCalendar = { id: 'calendar-1' } as ICalendar;

      // Act
      const result = await service.applyAuthorizationPolicy(
        inputCalendar,
        parentAuth
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(inheritedAuth);
    });

    it('should cascade authorization to multiple events when calendar has multiple events', async () => {
      // Arrange
      const parentAuth = { id: 'parent-auth' } as IAuthorizationPolicy;
      const calendarAuth = { id: 'calendar-auth' } as IAuthorizationPolicy;
      const inheritedAuth = { id: 'inherited-auth' } as IAuthorizationPolicy;
      const eventAuth1 = { id: 'event-auth-1' } as IAuthorizationPolicy;
      const eventAuth2 = { id: 'event-auth-2' } as IAuthorizationPolicy;
      const mockEvent1 = { id: 'event-1' };
      const mockEvent2 = { id: 'event-2' };
      const mockCalendar = {
        id: 'calendar-1',
        authorization: calendarAuth,
        events: [mockEvent1, mockEvent2],
      } as unknown as ICalendar;

      calendarService.getCalendarOrFail = vi
        .fn()
        .mockResolvedValue(mockCalendar);
      authorizationPolicyService.reset = vi.fn().mockReturnValue(calendarAuth);
      authorizationPolicyService.inheritParentAuthorization = vi
        .fn()
        .mockReturnValue(inheritedAuth);
      calendarEventAuthorizationService.applyAuthorizationPolicy = vi
        .fn()
        .mockResolvedValueOnce([eventAuth1])
        .mockResolvedValueOnce([eventAuth2]);

      const inputCalendar = { id: 'calendar-1' } as ICalendar;

      // Act
      const result = await service.applyAuthorizationPolicy(
        inputCalendar,
        parentAuth
      );

      // Assert
      expect(
        calendarEventAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(3); // calendar + 2 events
      expect(result).toContain(inheritedAuth);
      expect(result).toContain(eventAuth1);
      expect(result).toContain(eventAuth2);
    });

    it('should load calendar with events relation when fetching', async () => {
      // Arrange
      const calendarAuth = { id: 'calendar-auth' } as IAuthorizationPolicy;
      const mockCalendar = {
        id: 'calendar-1',
        authorization: calendarAuth,
        events: [],
      } as unknown as ICalendar;

      calendarService.getCalendarOrFail = vi
        .fn()
        .mockResolvedValue(mockCalendar);
      authorizationPolicyService.reset = vi.fn().mockReturnValue(calendarAuth);
      authorizationPolicyService.inheritParentAuthorization = vi
        .fn()
        .mockReturnValue(calendarAuth);

      const inputCalendar = { id: 'calendar-1' } as ICalendar;

      // Act
      await service.applyAuthorizationPolicy(inputCalendar, undefined);

      // Assert
      expect(calendarService.getCalendarOrFail).toHaveBeenCalledWith(
        'calendar-1',
        { relations: { events: true } }
      );
    });
  });
});
