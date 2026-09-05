import { UnauthenticatedHttpException } from '@common/exceptions/http';
import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(UnauthenticatedHttpException)
export class ContentSigningReturnFilter implements ExceptionFilter {
  catch(_: UnauthenticatedHttpException, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    if (response.headersSent) return;
    const request = http.getRequest<Request>();
    const returnUrl = `/api/public${request.originalUrl ?? request.url ?? '/'}`;
    response.set({
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    });
    response.redirect(302, `/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  }
}
