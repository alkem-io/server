import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { CalendarService } from '../calendar/calendar.service';
import { Timeline } from './timeline.entity';
import { ITimeline } from './timeline.interface';
import { TimelineService } from './timeline.service';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

describe('TimelineService', () => {
  let service: TimelineService;
  let calendarService: CalendarService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let db: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimelineService,
        MockCacheManager,
        MockWinstonProvider,
        mockDrizzleProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<TimelineService>(TimelineService);
    calendarService = module.get<CalendarService>(CalendarService);
    authorizationPolicyService = module.get<AuthorizationPolicyService>(
      AuthorizationPolicyService
    );
    db = module.get(DRIZZLE);
  });

  describe('createTimeline', () => {
    it('should return a timeline with a TIMELINE authorization policy when called', () => {
      // Arrange
      const mockCalendar = { id: 'calendar-1', events: [] };
      calendarService.createCalendar = vi.fn().mockReturnValue(mockCalendar);

      // Act
      const result = service.createTimeline();

      // Assert
      expect(result).toBeDefined();
      expect(result.authorization).toBeInstanceOf(AuthorizationPolicy);
      expect(result.authorization?.type).toBe(AuthorizationPolicyType.TIMELINE);
    });

    it('should delegate calendar creation to CalendarService when called', () => {
      // Arrange
      const mockCalendar = { id: 'calendar-1', events: [] };
      calendarService.createCalendar = vi.fn().mockReturnValue(mockCalendar);

      // Act
      const result = service.createTimeline();

      // Assert
      expect(calendarService.createCalendar).toHaveBeenCalledOnce();
      expect(result.calendar).toBe(mockCalendar);
    });
  });

  describe('deleteTimeline', () => {
    it('should delete authorization policy and calendar when timeline has both', async () => {
      // Arrange
      const timelineId = 'timeline-1';
      const mockAuthorization = { id: 'auth-1' } as AuthorizationPolicy;
      const mockCalendar = { id: 'calendar-1' };
      const mockTimeline = {
        id: timelineId,
        authorization: mockAuthorization,
        calendar: mockCalendar,
      } as unknown as Timeline;

      db.query.timelines.findFirst.mockResolvedValueOnce(mockTimeline);
      authorizationPolicyService.delete = vi.fn().mockResolvedValue(undefined);
      calendarService.deleteCalendar = vi.fn().mockResolvedValue(mockCalendar);

      // Act
      await service.deleteTimeline(timelineId);

      // Assert
      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        mockAuthorization
      );
      expect(calendarService.deleteCalendar).toHaveBeenCalledWith(
        mockCalendar.id
      );
    });

    it('should skip authorization deletion when timeline has no authorization', async () => {
      // Arrange
      const timelineId = 'timeline-2';
      const mockCalendar = { id: 'calendar-2' };
      const mockTimeline = {
        id: timelineId,
        authorization: undefined,
        calendar: mockCalendar,
      } as unknown as Timeline;

      db.query.timelines.findFirst.mockResolvedValueOnce(mockTimeline);
      authorizationPolicyService.delete = vi.fn();
      calendarService.deleteCalendar = vi.fn().mockResolvedValue(mockCalendar);

      // Act
      await service.deleteTimeline(timelineId);

      // Assert
      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
      expect(calendarService.deleteCalendar).toHaveBeenCalledWith(
        mockCalendar.id
      );
    });

    it('should skip calendar deletion when timeline has no calendar', async () => {
      // Arrange
      const timelineId = 'timeline-3';
      const mockAuthorization = { id: 'auth-3' } as AuthorizationPolicy;
      const mockTimeline = {
        id: timelineId,
        authorization: mockAuthorization,
        calendar: undefined,
      } as unknown as Timeline;

      db.query.timelines.findFirst.mockResolvedValueOnce(mockTimeline);
      authorizationPolicyService.delete = vi.fn().mockResolvedValue(undefined);
      calendarService.deleteCalendar = vi.fn();

      // Act
      await service.deleteTimeline(timelineId);

      // Assert
      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        mockAuthorization
      );
      expect(calendarService.deleteCalendar).not.toHaveBeenCalled();
    });

    it('should throw EntityNotFoundException when timeline does not exist', async () => {
      // Arrange

      // Act & Assert
      await expect(service.deleteTimeline('non-existent-id')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getTimelineOrFail', () => {
    it('should return the timeline when it exists', async () => {
      // Arrange
      const timelineId = 'timeline-1';
      const mockTimeline = { id: timelineId } as Timeline;

      db.query.timelines.findFirst.mockResolvedValueOnce(mockTimeline);

      // Act
      const result = await service.getTimelineOrFail(timelineId);

      // Assert
      expect(result).toBe(mockTimeline);
    });

    it('should throw EntityNotFoundException when timeline does not exist', async () => {
      // Arrange

      // Act & Assert
      await expect(
        service.getTimelineOrFail('non-existent-id')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });
  describe('getCalendarOrFail', () => {
    it('should return the calendar when timeline has a calendar loaded', async () => {
      // Arrange
      const mockCalendar = { id: 'calendar-1', events: [] };
      const mockTimeline = {
        id: 'timeline-1',
        calendar: mockCalendar,
      } as unknown as Timeline;

      db.query.timelines.findFirst.mockResolvedValueOnce(mockTimeline);

      const inputTimeline = { id: 'timeline-1' } as ITimeline;

      // Act
      const result = await service.getCalendarOrFail(inputTimeline);

      // Assert
      expect(result).toBe(mockCalendar);
    });

    it('should throw EntityNotFoundException when timeline has no calendar', async () => {
      // Arrange
      const mockTimeline = {
        id: 'timeline-1',
        calendar: undefined,
      } as unknown as Timeline;

      db.query.timelines.findFirst.mockResolvedValueOnce(mockTimeline);

      const inputTimeline = { id: 'timeline-1' } as ITimeline;

      // Act & Assert
      await expect(service.getCalendarOrFail(inputTimeline)).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should throw EntityNotFoundException when timeline itself does not exist', async () => {
      // Arrange

      const inputTimeline = { id: 'non-existent-id' } as ITimeline;

      // Act & Assert
      await expect(service.getCalendarOrFail(inputTimeline)).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should load the calendar relation when fetching the timeline', async () => {
      // Arrange
      const mockCalendar = { id: 'calendar-1', events: [] };
      const mockTimeline = {
        id: 'timeline-1',
        calendar: mockCalendar,
      } as unknown as Timeline;

      db.query.timelines.findFirst.mockResolvedValueOnce(mockTimeline);

      const inputTimeline = { id: 'timeline-1' } as ITimeline;

      // Act
      await service.getCalendarOrFail(inputTimeline);

      // Assert
    });
  });
});
