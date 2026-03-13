import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { ForbiddenException } from '@common/exceptions/forbidden.exception';
import { ForbiddenHttpException } from '@common/exceptions/http';
import { ArgumentsHost } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UrlGeneratorService } from '@services/infrastructure/url-generator';
import { Request, Response } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { vi } from 'vitest';
import { CalendarEventIcsRedirectFilter } from './calendar-event-ics.redirect.filter';

describe('CalendarEventIcsRedirectFilter', () => {
  let filter: CalendarEventIcsRedirectFilter;
  let urlGeneratorService: UrlGeneratorService;
  let mockLogger: any;
  let mockResponse: Partial<Response>;
  let mockRequest: {
    originalUrl?: string;
    url?: string;
    path?: string;
  };
  let mockHost: ArgumentsHost;

  const createForbiddenAuthorizationPolicyException = () =>
    new ForbiddenAuthorizationPolicyException(
      'Access denied',
      AuthorizationPrivilege.READ,
      'policy-1',
      'user-123'
    );

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarEventIcsRedirectFilter,
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: {
            error: vi.fn(),
            warn: vi.fn(),
            verbose: vi.fn(),
            debug: vi.fn(),
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

    filter = module.get(CalendarEventIcsRedirectFilter);
    urlGeneratorService = module.get(UrlGeneratorService);
    mockLogger = module.get(WINSTON_MODULE_NEST_PROVIDER);

    mockResponse = {
      redirect: vi.fn(),
      headersSent: false,
    };

    mockRequest = {
      originalUrl: '/event/event-123/ics',
      url: '/event/event-123/ics',
      path: '/event/event-123/ics',
    };

    mockHost = {
      switchToHttp: vi.fn().mockReturnValue({
        getResponse: vi.fn().mockReturnValue(mockResponse),
        getRequest: vi.fn().mockReturnValue(mockRequest as Request),
      }),
    } as unknown as ArgumentsHost;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('catch - ForbiddenAuthorizationPolicyException', () => {
    it('should redirect to /restricted with returnUrl for ForbiddenAuthorizationPolicyException', async () => {
      const exception = createForbiddenAuthorizationPolicyException();

      vi.spyOn(
        urlGeneratorService,
        'getCalendarEventUrlPath'
      ).mockResolvedValue('https://alkem.io/spaces/space-1/calendar/event-123');

      await filter.catch(exception, mockHost);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        302,
        '/restricted?returnUrl=%2Fspaces%2Fspace-1%2Fcalendar%2Fevent-123'
      );
    });

    it('should extract event ID from request path for ForbiddenAuthorizationPolicyException', async () => {
      const exception = createForbiddenAuthorizationPolicyException();

      const getUrlSpy = vi
        .spyOn(urlGeneratorService, 'getCalendarEventUrlPath')
        .mockResolvedValue('https://alkem.io/event/event-123');

      await filter.catch(exception, mockHost);

      expect(getUrlSpy).toHaveBeenCalledWith('event-123');
    });

    it('should handle different event ID formats', async () => {
      mockRequest.path = '/event/abc-123-def/ics';

      const exception = createForbiddenAuthorizationPolicyException();

      const getUrlSpy = vi
        .spyOn(urlGeneratorService, 'getCalendarEventUrlPath')
        .mockResolvedValue('https://alkem.io/event/abc-123-def');

      await filter.catch(exception, mockHost);

      expect(getUrlSpy).toHaveBeenCalledWith('abc-123-def');
    });

    it('should fallback to request path when event URL resolution fails', async () => {
      const exception = createForbiddenAuthorizationPolicyException();

      vi.spyOn(
        urlGeneratorService,
        'getCalendarEventUrlPath'
      ).mockRejectedValue(new Error('Event not found'));

      await filter.catch(exception, mockHost);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        302,
        '/restricted?returnUrl=%2Fevent%2Fevent-123%2Fics'
      );
    });

    it('should fallback to request path when event ID cannot be extracted', async () => {
      mockRequest.path = '/some/other/path';

      const exception = createForbiddenAuthorizationPolicyException();

      await filter.catch(exception, mockHost);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        302,
        '/restricted?returnUrl=%2Fsome%2Fother%2Fpath'
      );
    });

    it('should log debug message when URL resolution fails', async () => {
      const exception = createForbiddenAuthorizationPolicyException();

      const error = new Error('Event not found');
      vi.spyOn(
        urlGeneratorService,
        'getCalendarEventUrlPath'
      ).mockRejectedValue(error);

      await filter.catch(exception, mockHost);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          message:
            'Unable to resolve calendar event origin path. Falling back to request path.',
          error,
        },
        LogContext.CALENDAR
      );
    });
  });

  describe('catch - ForbiddenException', () => {
    it('should redirect to /restricted with returnUrl for ForbiddenException', async () => {
      const exception = new ForbiddenException(
        'Forbidden',
        LogContext.CALENDAR
      );

      vi.spyOn(
        urlGeneratorService,
        'getCalendarEventUrlPath'
      ).mockResolvedValue('https://alkem.io/event/event-123');

      await filter.catch(exception, mockHost);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        302,
        '/restricted?returnUrl=%2Fevent%2Fevent-123'
      );
    });
  });

  describe('catch - ForbiddenHttpException', () => {
    it('should redirect to /login with returnUrl for ForbiddenHttpException', async () => {
      const exception = new ForbiddenHttpException(
        'Authentication required',
        LogContext.CALENDAR
      );

      await filter.catch(exception, mockHost);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        302,
        '/login?returnUrl=%2Fevent%2Fevent-123%2Fics'
      );
    });

    it('should use originalUrl when available', async () => {
      mockRequest.originalUrl = '/custom/original/url';

      const exception = new ForbiddenHttpException(
        'Authentication required',
        LogContext.CALENDAR
      );

      await filter.catch(exception, mockHost);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        302,
        '/login?returnUrl=%2Fcustom%2Foriginal%2Furl'
      );
    });

    it('should fallback to url when originalUrl is not available', async () => {
      mockRequest.originalUrl = undefined;
      mockRequest.url = '/fallback/url';

      const exception = new ForbiddenHttpException(
        'Authentication required',
        LogContext.CALENDAR
      );

      await filter.catch(exception, mockHost);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        302,
        '/login?returnUrl=%2Ffallback%2Furl'
      );
    });

    it('should fallback to root when no URL is available', async () => {
      mockRequest.originalUrl = undefined;
      mockRequest.url = undefined;

      const exception = new ForbiddenHttpException(
        'Authentication required',
        LogContext.CALENDAR
      );

      await filter.catch(exception, mockHost);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        302,
        '/login?returnUrl=%2F'
      );
    });
  });

  describe('catch - headers already sent', () => {
    it('should not redirect when headers are already sent', async () => {
      mockResponse.headersSent = true;

      const exception = new ForbiddenHttpException(
        'Authentication required',
        LogContext.CALENDAR
      );

      await filter.catch(exception, mockHost);

      expect(mockResponse.redirect).not.toHaveBeenCalled();
    });

    it('should not redirect for ForbiddenAuthorizationPolicyException when headers sent', async () => {
      mockResponse.headersSent = true;

      const exception = new ForbiddenAuthorizationPolicyException(
        'Access denied',
        AuthorizationPrivilege.READ,
        '',
        ''
      );

      await filter.catch(exception, mockHost);

      expect(mockResponse.redirect).not.toHaveBeenCalled();
    });
  });

  describe('extractEventId', () => {
    it('should extract event ID from standard path', async () => {
      mockRequest.path = '/event/event-123/ics';

      const exception = new ForbiddenAuthorizationPolicyException(
        'Access denied',
        AuthorizationPrivilege.READ,
        '',
        ''
      );

      const getUrlSpy = vi
        .spyOn(urlGeneratorService, 'getCalendarEventUrlPath')
        .mockResolvedValue('https://alkem.io/event/event-123');

      await filter.catch(exception, mockHost);

      expect(getUrlSpy).toHaveBeenCalledWith('event-123');
    });

    it('should extract event ID with hyphens and numbers', async () => {
      mockRequest.path = '/event/my-event-2026-03/ics';

      const exception = createForbiddenAuthorizationPolicyException();

      const getUrlSpy = vi
        .spyOn(urlGeneratorService, 'getCalendarEventUrlPath')
        .mockResolvedValue('https://alkem.io/event/my-event-2026-03');

      await filter.catch(exception, mockHost);

      expect(getUrlSpy).toHaveBeenCalledWith('my-event-2026-03');
    });

    it('should be case insensitive for /ics extension', async () => {
      mockRequest.path = '/event/event-123/ICS';

      const exception = createForbiddenAuthorizationPolicyException();

      const getUrlSpy = vi
        .spyOn(urlGeneratorService, 'getCalendarEventUrlPath')
        .mockResolvedValue('https://alkem.io/event/event-123');

      await filter.catch(exception, mockHost);

      expect(getUrlSpy).toHaveBeenCalledWith('event-123');
    });

    it('should return undefined for non-matching paths', async () => {
      mockRequest.path = '/some/other/path';

      const exception = createForbiddenAuthorizationPolicyException();

      const getUrlSpy = vi.spyOn(
        urlGeneratorService,
        'getCalendarEventUrlPath'
      );

      await filter.catch(exception, mockHost);

      expect(getUrlSpy).not.toHaveBeenCalled();
    });

    it('should handle undefined path', async () => {
      mockRequest.path = undefined;

      const exception = createForbiddenAuthorizationPolicyException();

      await filter.catch(exception, mockHost);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        302,
        '/restricted?returnUrl=%2F'
      );
    });
  });

  describe('resolveOrigin', () => {
    it('should extract pathname from resolved URL', async () => {
      const exception = createForbiddenAuthorizationPolicyException();

      vi.spyOn(
        urlGeneratorService,
        'getCalendarEventUrlPath'
      ).mockResolvedValue(
        'https://alkem.io/spaces/space-1/calendar/events/event-123'
      );

      await filter.catch(exception, mockHost);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        302,
        '/restricted?returnUrl=%2Fspaces%2Fspace-1%2Fcalendar%2Fevents%2Fevent-123'
      );
    });

    it('should handle URLs with query parameters', async () => {
      const exception = createForbiddenAuthorizationPolicyException();

      vi.spyOn(
        urlGeneratorService,
        'getCalendarEventUrlPath'
      ).mockResolvedValue('https://alkem.io/event/event-123?tab=details');

      await filter.catch(exception, mockHost);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        302,
        '/restricted?returnUrl=%2Fevent%2Fevent-123'
      );
    });

    it('should handle URLs with hash fragments', async () => {
      const exception = createForbiddenAuthorizationPolicyException();

      vi.spyOn(
        urlGeneratorService,
        'getCalendarEventUrlPath'
      ).mockResolvedValue('https://alkem.io/event/event-123#section');

      await filter.catch(exception, mockHost);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        302,
        '/restricted?returnUrl=%2Fevent%2Fevent-123'
      );
    });
  });

  describe('URL encoding', () => {
    it('should properly encode returnUrl with special characters', async () => {
      mockRequest.originalUrl = '/event/test event/ics';

      const exception = new ForbiddenHttpException(
        'Authentication required',
        LogContext.CALENDAR
      );

      await filter.catch(exception, mockHost);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        302,
        '/login?returnUrl=%2Fevent%2Ftest%20event%2Fics'
      );
    });

    it('should handle complex URLs with multiple special characters', async () => {
      const exception = createForbiddenAuthorizationPolicyException();

      vi.spyOn(
        urlGeneratorService,
        'getCalendarEventUrlPath'
      ).mockResolvedValue('https://alkem.io/spaces/my-space/events/my-event');

      await filter.catch(exception, mockHost);

      expect(mockResponse.redirect).toHaveBeenCalled();
      const redirectCall = (mockResponse.redirect as any).mock.calls[0];
      expect(redirectCall[0]).toBe(302);
      expect(redirectCall[1]).toContain('/restricted?returnUrl=');
    });
  });
});
