import {
  Inject,
  Injectable,
  LoggerService,
  NestMiddleware,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { ConfigurationTypes, LogContext } from '@src/common/enums';
import { getSession } from '@common/utils';
import { Configuration, FrontendApi, Session } from '@ory/kratos-client';

@Injectable()
export class SessionExtendMiddleware implements NestMiddleware {
  private readonly SESSION_COOKIE_NAME: string;
  private readonly enabled: boolean;
  private readonly kratosClient: FrontendApi;
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

    const kratosPublicBaseUrl = this.configService.get(
      ConfigurationTypes.IDENTITY
    ).authentication.providers.ory.kratos_public_base_url_server;

    this.kratosClient = new FrontendApi(
      new Configuration({
        basePath: kratosPublicBaseUrl,
      })
    );
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

    let session: Session;
    try {
      session = await getSession(this.kratosClient, {
        authorization,
      });
    } catch (e: any) {
      this.logger.error(
        `Error while extracting ory session: ${e?.message}`,
        e?.stack,
        LogContext.AUTH_TOKEN
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
          'New session cookie not sent: new session not found',
          LogContext.AUTH_TOKEN
        );
        return next();
      }

      const orySessionId: string | undefined =
        req.cookies[this.SESSION_COOKIE_NAME];
      if (!orySessionId) {
        this.logger.warn?.(
          'New session cookie not sent: new session id not found',
          LogContext.AUTH_TOKEN
        );
        return next();
      }

      const { expires_at: newExpiry } = newSession;

      if (!newExpiry) {
        this.logger.warn?.(
          'New session cookie not sent: new expiry date not defined',
          LogContext.AUTH_TOKEN
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

      this.logger.verbose?.('New session cookie sent', LogContext.AUTH_TOKEN);
    }

    next();
  }
}
