import { getSessionFromJwt } from '@common/utils';
import { AuthenticationService } from '@core/authentication/authentication.service';
import {
  Inject,
  Injectable,
  LoggerService,
  NestMiddleware,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Configuration, FrontendApi, Session } from '@ory/kratos-client';
import { LogContext } from '@src/common/enums';
import { AlkemioConfig } from '@src/types';
import { NextFunction, Request, Response } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class SessionExtendMiddleware implements NestMiddleware {
  private readonly SESSION_COOKIE_NAME: string;
  private readonly enabled: boolean;
  private readonly kratosClient: FrontendApi;
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly authService: AuthenticationService,
    private readonly configService: ConfigService<AlkemioConfig, true>
  ) {
    this.SESSION_COOKIE_NAME = this.configService.get(
      'identity.authentication.providers.ory.session_cookie_name',
      { infer: true }
    );

    this.enabled = this.configService.get(
      'identity.authentication.providers.ory.session_extend_enabled',
      { infer: true }
    );

    const kratosPublicBaseUrl = this.configService.get(
      'identity.authentication.providers.ory.kratos_public_base_url_server',
      { infer: true }
    );

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
      session = getSessionFromJwt(authorization);
    } catch (e: any) {
      this.logger.verbose?.(
        `Error while extracting ory session: ${e?.message}`,
        LogContext.AUTH_TOKEN
      );
      return next();
    }

    if (this.authService.shouldExtendSession(session)) {
      try {
        await this.authService.extendSession(session);
      } catch (error) {
        this.logger.error(
          `Ory Kratos session failed to be extended: ${error}`,
          LogContext.AUTH
        );
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

      /**
       * Session cookies in Ory Kratos are pass-by-value (meaning they are not just an id or a reference to a session).
       * When session is updated, new cookie must be obtained and sent to the client.
       * toSession() calls /sessions/whoami endpoint that handles that.
       * Another strategy (may be a more reliable one) is to call /sessions/whoami from the client for the cookies.
       * In that case we may want to set a special header (e.g. X-Session-Extended) to indicate that the session is extended,
       * that in turns will trigger the client to call /sessions/whoami.
       */
      const { headers } = await this.kratosClient.toSession({
        cookie: req.headers.cookie,
      });

      res.header('Set-Cookie', headers['set-cookie']);

      this.logger.verbose?.('New session cookie sent', LogContext.AUTH_TOKEN);
    }

    next();
  }
}
