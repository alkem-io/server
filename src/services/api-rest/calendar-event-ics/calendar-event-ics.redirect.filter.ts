import { LogContext } from '@common/enums';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { ForbiddenException } from '@common/exceptions/forbidden.exception';
import { ForbiddenHttpException } from '@common/exceptions/http';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { UrlGeneratorService } from '@services/infrastructure/url-generator';
import { Request, Response } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Catch(
  ForbiddenHttpException,
  ForbiddenAuthorizationPolicyException,
  ForbiddenException
)
export class CalendarEventIcsRedirectFilter implements ExceptionFilter {
  constructor(
    private readonly urlGeneratorService: UrlGeneratorService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async catch(exception: Error, host: ArgumentsHost) {
    const httpArguments = host.switchToHttp();
    const response = httpArguments.getResponse<Response>();
    const request = httpArguments.getRequest<Request>();

    if (response.headersSent) {
      return exception;
    }

    if (
      exception instanceof ForbiddenAuthorizationPolicyException ||
      exception instanceof ForbiddenException
    ) {
      const origin = await this.resolveOrigin(request);
      response.redirect(
        302,
        `/restricted?returnUrl=${encodeURIComponent(origin)}`
      );
      return exception;
    }

    const returnUrl = this.getReturnUrl(request);
    response.redirect(302, `/login?returnUrl=${encodeURIComponent(returnUrl)}`);
    return exception;
  }

  private getReturnUrl(request: Request): string {
    return request.originalUrl ?? request.url ?? '/';
  }

  private async resolveOrigin(request: Request): Promise<string> {
    const eventId = this.extractEventId(request);
    if (!eventId) {
      return request.path ?? '/';
    }

    try {
      const eventUrl =
        await this.urlGeneratorService.getCalendarEventUrlPath(eventId);
      const parsed = new URL(eventUrl);
      return parsed.pathname || request.path || '/';
    } catch (error) {
      this.logger.debug?.(
        `Unable to resolve calendar event origin path. Falling back to request path.`,
        LogContext.CALENDAR,
        { error }
      );
      return request.path ?? '/';
    }
  }

  private extractEventId(request: Request): string | undefined {
    const match = request.path?.match(/\/event\/([^/]+)\/ics$/i);
    return match?.[1];
  }
}
