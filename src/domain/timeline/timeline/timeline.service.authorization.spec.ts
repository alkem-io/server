import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CalendarAuthorizationService } from '@domain/timeline/calendar/calendar.service.authorization';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { ITimeline } from './timeline.interface';
import { TimelineService } from './timeline.service';
import { TimelineAuthorizationService } from './timeline.service.authorization';

describe('TimelineAuthorizationService', () => {
  let service: TimelineAuthorizationService;
  let timelineService: TimelineService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let calendarAuthorizationService: CalendarAuthorizationService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimelineAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<TimelineAuthorizationService>(
      TimelineAuthorizationService
    );
    timelineService = module.get<TimelineService>(TimelineService);
    authorizationPolicyService = module.get<AuthorizationPolicyService>(
      AuthorizationPolicyService
    );
    calendarAuthorizationService = module.get<CalendarAuthorizationService>(
      CalendarAuthorizationService
    );
  });

  describe('applyAuthorizationPolicy', () => {
    it('should inherit parent authorization and cascade to calendar when timeline has calendar', async () => {
      // Arrange
      const parentAuth = { id: 'parent-auth' } as IAuthorizationPolicy;
      const timelineAuth = { id: 'timeline-auth' } as IAuthorizationPolicy;
      const calendarAuth = { id: 'calendar-auth' } as IAuthorizationPolicy;
      const mockCalendar = { id: 'calendar-1' };
      const mockTimeline = {
        id: 'timeline-1',
        authorization: timelineAuth,
        calendar: mockCalendar,
      } as unknown as ITimeline;

      timelineService.getTimelineOrFail.mockResolvedValue(mockTimeline);
      authorizationPolicyService.inheritParentAuthorization.mockReturnValue(timelineAuth);
      calendarAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([calendarAuth]);

      const inputTimeline = { id: 'timeline-1' } as ITimeline;

      // Act
      const result = await service.applyAuthorizationPolicy(
        inputTimeline,
        parentAuth
      );

      // Assert
      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(timelineAuth, parentAuth);
      expect(
        calendarAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalledWith(mockCalendar, timelineAuth);
      expect(result).toContain(timelineAuth);
      expect(result).toContain(calendarAuth);
      expect(result).toHaveLength(2);
    });

    it('should throw RelationshipNotFoundException when calendar is not loaded', async () => {
      // Arrange
      const parentAuth = { id: 'parent-auth' } as IAuthorizationPolicy;
      const mockTimeline = {
        id: 'timeline-1',
        authorization: { id: 'auth-1' },
        calendar: undefined,
      } as unknown as ITimeline;

      timelineService.getTimelineOrFail.mockResolvedValue(mockTimeline);

      const inputTimeline = { id: 'timeline-1' } as ITimeline;

      // Act & Assert
      await expect(
        service.applyAuthorizationPolicy(inputTimeline, parentAuth)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should pass undefined parent authorization when no parent is provided', async () => {
      // Arrange
      const timelineAuth = { id: 'timeline-auth' } as IAuthorizationPolicy;
      const mockCalendar = { id: 'calendar-1' };
      const mockTimeline = {
        id: 'timeline-1',
        authorization: timelineAuth,
        calendar: mockCalendar,
      } as unknown as ITimeline;

      timelineService.getTimelineOrFail.mockResolvedValue(mockTimeline);
      authorizationPolicyService.inheritParentAuthorization.mockReturnValue(timelineAuth);
      calendarAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([]);

      const inputTimeline = { id: 'timeline-1' } as ITimeline;

      // Act
      await service.applyAuthorizationPolicy(inputTimeline, undefined);

      // Assert
      expect(
        authorizationPolicyService.inheritParentAuthorization
      ).toHaveBeenCalledWith(timelineAuth, undefined);
    });

    it('should load timeline with calendar relation when fetching', async () => {
      // Arrange
      const timelineAuth = { id: 'timeline-auth' } as IAuthorizationPolicy;
      const mockTimeline = {
        id: 'timeline-1',
        authorization: timelineAuth,
        calendar: { id: 'cal-1' },
      } as unknown as ITimeline;

      timelineService.getTimelineOrFail.mockResolvedValue(mockTimeline);
      authorizationPolicyService.inheritParentAuthorization.mockReturnValue(timelineAuth);
      calendarAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([]);

      const inputTimeline = { id: 'timeline-1' } as ITimeline;

      // Act
      await service.applyAuthorizationPolicy(inputTimeline, undefined);

      // Assert
      expect(timelineService.getTimelineOrFail).toHaveBeenCalledWith(
        'timeline-1',
        { relations: { calendar: true } }
      );
    });
  });
});
