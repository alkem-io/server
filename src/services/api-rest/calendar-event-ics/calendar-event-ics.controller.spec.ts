import { ActorContext } from '@core/actor-context/actor.context';
import { Test, TestingModule } from '@nestjs/testing';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { Request, Response } from 'express';
import { vi } from 'vitest';
import { CalendarEventIcsController } from './calendar-event-ics.controller';
import { CalendarEventIcsRedirectFilter } from './calendar-event-ics.redirect.filter';
import {
  CalendarEventIcsResult,
  CalendarEventIcsService,
} from './calendar-event-ics.service';

describe('CalendarEventIcsController', () => {
  let controller: CalendarEventIcsController;
  let calendarEventIcsService: CalendarEventIcsService;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;

  const mockIcsResult: CalendarEventIcsResult = {
    filename: 'team-meeting.ics',
    content: 'BEGIN:VCALENDAR\nEND:VCALENDAR',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CalendarEventIcsController],
      providers: [
        MockWinstonProvider,
        {
          provide: CalendarEventIcsService,
          useValue: {
            generateIcs: vi.fn(),
          },
        },
        {
          provide: CalendarEventIcsRedirectFilter,
          useValue: {
            catch: vi.fn(),
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

    controller = module.get(CalendarEventIcsController);
    calendarEventIcsService = module.get(CalendarEventIcsService);

    mockResponse = {
      redirect: vi.fn(),
      set: vi.fn(),
      send: vi.fn(),
    };

    mockRequest = {
      originalUrl: '/rest/calendar/event/event-123/ics',
      url: '/rest/calendar/event/event-123/ics',
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('downloadIcs', () => {
    it('should redirect to /login when actorContext is undefined', async () => {
      const actorContext = undefined as unknown as ActorContext;

      await controller.downloadIcs(
        'event-123',
        actorContext,
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        302,
        `/login?returnUrl=${encodeURIComponent('/rest/calendar/event/event-123/ics')}`
      );
      expect(mockResponse.send).not.toHaveBeenCalled();
    });

    it('should redirect to /login when actorContext has no actorID', async () => {
      const actorContext = { actorID: undefined } as unknown as ActorContext;

      await controller.downloadIcs(
        'event-123',
        actorContext,
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        302,
        `/login?returnUrl=${encodeURIComponent('/rest/calendar/event/event-123/ics')}`
      );
    });

    it('should redirect to /login when actorContext has empty actorID', async () => {
      const actorContext = { actorID: '' } as unknown as ActorContext;

      await controller.downloadIcs(
        'event-123',
        actorContext,
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        302,
        `/login?returnUrl=${encodeURIComponent('/rest/calendar/event/event-123/ics')}`
      );
    });

    it('should use req.url as fallback when originalUrl is missing', async () => {
      const actorContext = undefined as unknown as ActorContext;
      mockRequest.originalUrl = undefined;
      mockRequest.url = '/fallback-url';

      await controller.downloadIcs(
        'event-123',
        actorContext,
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        302,
        `/login?returnUrl=${encodeURIComponent('/fallback-url')}`
      );
    });

    it('should use "/" as fallback when no URL is available', async () => {
      const actorContext = undefined as unknown as ActorContext;
      mockRequest.originalUrl = undefined;
      mockRequest.url = undefined;

      await controller.downloadIcs(
        'event-123',
        actorContext,
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        302,
        '/login?returnUrl=%2F'
      );
    });

    it('should call service.generateIcs with correct parameters on success', async () => {
      const actorContext = { actorID: 'user-123' } as ActorContext;
      vi.spyOn(calendarEventIcsService, 'generateIcs').mockResolvedValue(
        mockIcsResult
      );

      await controller.downloadIcs(
        'event-456',
        actorContext,
        mockRequest as Request,
        mockResponse as Response
      );

      expect(calendarEventIcsService.generateIcs).toHaveBeenCalledWith(
        'event-456',
        actorContext
      );
    });

    it('should set correct response headers', async () => {
      const actorContext = { actorID: 'user-123' } as ActorContext;
      vi.spyOn(calendarEventIcsService, 'generateIcs').mockResolvedValue(
        mockIcsResult
      );

      await controller.downloadIcs(
        'event-123',
        actorContext,
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.set).toHaveBeenCalledWith({
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="team-meeting.ics"',
        'Cache-Control': 'no-store',
      });
    });

    it('should send ICS content in response body', async () => {
      const actorContext = { actorID: 'user-123' } as ActorContext;
      vi.spyOn(calendarEventIcsService, 'generateIcs').mockResolvedValue(
        mockIcsResult
      );

      await controller.downloadIcs(
        'event-123',
        actorContext,
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.send).toHaveBeenCalledWith(
        'BEGIN:VCALENDAR\nEND:VCALENDAR'
      );
    });

    it('should not redirect when actorContext is valid', async () => {
      const actorContext = { actorID: 'user-123' } as ActorContext;
      vi.spyOn(calendarEventIcsService, 'generateIcs').mockResolvedValue(
        mockIcsResult
      );

      await controller.downloadIcs(
        'event-123',
        actorContext,
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.redirect).not.toHaveBeenCalled();
    });

    it('should propagate service errors', async () => {
      const actorContext = { actorID: 'user-123' } as ActorContext;
      const error = new Error('Service failure');
      vi.spyOn(calendarEventIcsService, 'generateIcs').mockRejectedValue(error);

      await expect(
        controller.downloadIcs(
          'event-123',
          actorContext,
          mockRequest as Request,
          mockResponse as Response
        )
      ).rejects.toThrow('Service failure');
    });
  });
});
