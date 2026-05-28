import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import type { NextFunction, Request, Response } from 'express';
import { SessionStoreUnavailableError } from './cookie-session.errors';

// FR-022b — 503 + Retry-After: 5, NO Set-Cookie clearing (no max-age=0),
// NO redirect. The same cookie value is re-asserted on the response so the
// client's cookie jar stays warm across the transient outage; this is what
// distinguishes a "transient store outage" response from a "session ended"
// teardown response on the wire.
//
// `cookieName` is the per-env session cookie name; the Nest filter resolves
// it from config and the raw express middleware below accepts it as a
// factory argument so the test harness can pin its harness-local value.
function send503(req: Request, res: Response, cookieName: string): void {
  const sid = req.cookies?.[cookieName];
  if (typeof sid === 'string' && sid.length > 0) {
    res.cookie(cookieName, sid, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  }
  res.setHeader('Retry-After', '5');
  res.status(503).json({ error: 'session_store_unavailable' });
}

// Nest controller path (production wiring for T042a).
@Injectable()
@Catch(SessionStoreUnavailableError)
export class CookieSessionStoreUnavailableFilter implements ExceptionFilter {
  private readonly sessionCookieName: string;

  constructor(configService: ConfigService<AlkemioConfig, true>) {
    this.sessionCookieName = configService.get(
      'identity.authentication.providers.oidc',
      { infer: true }
    ).cookie.name;
  }

  catch(_exception: SessionStoreUnavailableError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    send503(
      ctx.getRequest<Request>(),
      ctx.getResponse<Response>(),
      this.sessionCookieName
    );
  }
}

// Raw express path (passport.authenticate as middleware → next(err) → here).
// Factory so the test harness can inject its own cookie name; production
// uses the Nest filter above and never instantiates this.
export const cookieSessionStoreUnavailableMiddleware =
  (cookieName: string) =>
  (err: unknown, req: Request, res: Response, next: NextFunction): void => {
    if (err instanceof SessionStoreUnavailableError) {
      send503(req, res, cookieName);
      return;
    }
    next(err);
  };
