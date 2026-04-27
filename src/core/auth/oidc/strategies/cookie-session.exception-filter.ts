import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  Injectable,
} from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import {
  COOKIE_SESSION_NAME,
  SessionStoreUnavailableError,
} from './cookie-session.errors';

// FR-022b — 503 + Retry-After: 5, NO Set-Cookie clearing (no max-age=0),
// NO redirect. The same cookie value is re-asserted on the response so the
// client's cookie jar stays warm across the transient outage; this is what
// distinguishes a "transient store outage" response from a "session ended"
// teardown response on the wire.
function send503(req: Request, res: Response): void {
  const sid = req.cookies?.[COOKIE_SESSION_NAME];
  if (typeof sid === 'string' && sid.length > 0) {
    res.cookie(COOKIE_SESSION_NAME, sid, {
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
  catch(
    _exception: SessionStoreUnavailableError,
    host: ArgumentsHost
  ): void {
    const ctx = host.switchToHttp();
    send503(ctx.getRequest<Request>(), ctx.getResponse<Response>());
  }
}

// Raw express path (passport.authenticate as middleware → next(err) → here).
export const cookieSessionStoreUnavailableMiddleware = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof SessionStoreUnavailableError) {
    send503(req, res);
    return;
  }
  next(err);
}
