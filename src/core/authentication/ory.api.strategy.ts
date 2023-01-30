import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Strategy } from 'passport-custom';
import {
  Configuration,
  IdentityApi,
  FrontendApi,
  Session,
} from '@ory/kratos-client';
import { ConfigurationTypes, LogContext } from '@common/enums';
import {
  ApiRestrictedAccessException,
  BearerTokenNotFoundException,
} from '@common/exceptions/auth';
import { AuthenticationService } from './authentication.service';
import { OryDefaultIdentitySchema } from './ory.default.identity.schema';
import { verifyIdentityIfOidcAuth } from './verify.identity.if.oidc.auth';

@Injectable()
export class OryApiStrategy extends PassportStrategy(
  Strategy,
  'oathkeeper-api-token'
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthenticationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    super();
  }

  async validate(payload: any) {
    const kratosPublicBaseUrl = this.configService.get(
      ConfigurationTypes.IDENTITY
    ).authentication.providers.ory.kratos_public_base_url_server;

    const apiAccessEnabled = this.configService.get(ConfigurationTypes.IDENTITY)
      .authentication.api_access_enabled;

    const kratosConfig = new Configuration({
      basePath: kratosPublicBaseUrl,
      baseOptions: {
        withCredentials: true, // Important for CORS
        timeout: 30000, // 30 seconds
      },
    });
    const ory = {
      identity: new IdentityApi(kratosConfig),
      frontend: new FrontendApi(kratosConfig),
    };

    if (!apiAccessEnabled) {
      throw new ApiRestrictedAccessException('API access is restricted!');
    }

    const authorizationHeader: string | undefined =
      payload.headers.authorization;

    const bearerToken = authorizationHeader?.split(' ')[1];

    if (!bearerToken) {
      throw new BearerTokenNotFoundException('Bearer token is not provided!');
    }

    const { data } = await ory.frontend.toSession({
      xSessionToken: bearerToken,
    });
    const session: Session = await ory.frontend
      .toSession({
        xSessionToken: bearerToken,
      })
      .then(({ data: session }) => session);

    if (!data) {
      this.logger.verbose?.('No Ory Kratos API session', LogContext.AUTH);
      return this.authService.createAgentInfo();
    }

    // const session = verifyIdentityIfOidcAuth(data);
    this.logger.verbose?.(session.identity, LogContext.AUTH);

    const oryIdentity = session.identity as OryDefaultIdentitySchema;
    return this.authService.createAgentInfo(oryIdentity);
  }
}
