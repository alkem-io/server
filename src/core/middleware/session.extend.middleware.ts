import {
  Inject,
  Injectable,
  LoggerService,
  NestMiddleware,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import jwt_decode from 'jwt-decode';
import { KratosPayload } from '@core/authentication/kratos.payload';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { LogContext } from '@src/common';

const ORY_KRATOS_COOKIE = 'ory_kratos_session';

@Injectable()
export class SessionExtendMiddleware implements NestMiddleware {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly authService: AuthenticationService
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const authorization = req.headers['authorization'];

    if (!authorization) {
      return next();
    }

    const [, token] = authorization.split(' ');
    const { session } = jwt_decode<KratosPayload>(token);

    if (this.authService.shouldExtendSession(session)) {
      const newSession = await this.authService
        .extendSession(session)
        .catch(error => {
          this.logger.error(
            `Ory Kratos session failed to be extended: ${error}`,
            LogContext.AUTH
          );
        });

      if (!newSession) {
        this.logger.warn?.(
          'New session cookie not sent: new session not found'
        );
        return next();
      }

      const orySessionId: string | undefined = req.cookies[ORY_KRATOS_COOKIE];
      if (!orySessionId) {
        this.logger.warn?.(
          'New session cookie not sent: new session id not found'
        );
        return next();
      }

      const { expires_at: newExpiry } = newSession;

      if (!newExpiry) {
        this.logger.warn?.(
          'New session cookie not sent: new expiry date not defined'
        );
        return next();
      }

      res.cookie(ORY_KRATOS_COOKIE, orySessionId, {
        path: '/',
        sameSite: 'lax',
        expires: new Date(newExpiry),
        httpOnly: true,
        encode: val => val, // skip encoding; pass the value as is
      });

      this.logger.verbose?.('New session cookie sent');
    }

    next();
  }
}
