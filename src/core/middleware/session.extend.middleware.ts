import {
  Inject,
  Injectable,
  LoggerService,
  NestMiddleware,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import jwt_decode from 'jwt-decode';
import { KratosPayload } from '@core/authentication/kratos.payload';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { ConfigurationTypes, LogContext } from '@src/common/enums';

@Injectable()
export class SessionExtendMiddleware implements NestMiddleware {
  private readonly SESSION_COOKIE_NAME: string;
  private readonly enabled: boolean;
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly authService: AuthenticationService,
    private readonly configService: ConfigService
  ) {
    this.SESSION_COOKIE_NAME = this.configService.get(
      ConfigurationTypes.IDENTITY
    )?.authentication.providers.ory.session_cookie_name;

    this.enabled = this.configService.get(
      ConfigurationTypes.IDENTITY
    )?.authentication.providers.ory.session_extend_enabled;
  }

  async use(req: Request, res: Response, next: NextFunction) {
    if (!this.enabled) {
      return next();
    }

    const authorization = req.headers['authorization'];

    if (!authorization) {
      this.logger.verbose?.(
        'Session extend middleware: authorization header not found'
      );
      return next();
    }

    const [, token] = authorization.split(' ');

    if (!token) {
      this.logger.verbose?.('Session extend middleware: token not found');
      return next();
    }

    let jwt;

    try {
      jwt = jwt_decode<KratosPayload>(token);
    } catch (error) {
      this.logger.verbose?.('Bearer token is not a valid JWT token!');
      return next();
    }

    const session = jwt.session;

    if (!session) {
      this.logger.verbose?.(
        'Session extend middleware: Kratos session not found in token'
      );
      return next();
    }

    if (this.authService.shouldExtendSession(session)) {
      const newSession = await this.authService
        .extendSession(session)
        .catch(error => {
          this.logger.error(
            `Ory Kratos session failed to be extended: ${error}`,
            error?.stack,
            LogContext.AUTH
          );
        });

      if (!newSession) {
        this.logger.warn?.(
          'New session cookie not sent: new session not found'
        );
        return next();
      }

      const orySessionId: string | undefined =
        req.cookies[this.SESSION_COOKIE_NAME];
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

      res.cookie(this.SESSION_COOKIE_NAME, orySessionId, {
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
