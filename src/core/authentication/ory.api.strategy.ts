import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Strategy } from 'passport-custom';
import { Configuration, FrontendApi } from '@ory/kratos-client';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { ApiRestrictedAccessException } from '@common/exceptions/auth';
import { AuthenticationService } from './authentication.service';
import { OryDefaultIdentitySchema } from './ory.default.identity.schema';
import { verifyIdentityIfOidcAuth } from './verify.identity.if.oidc.auth';
import { IncomingMessage } from 'http';

@Injectable()
export class OryApiStrategy extends PassportStrategy(
  Strategy,
  'oathkeeper-api-token'
) {
  private readonly kratosClient: FrontendApi;
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthenticationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    super();

    const kratosPublicBaseUrl = this.configService.get(
      ConfigurationTypes.IDENTITY
    ).authentication.providers.ory.kratos_public_base_url_server;

    this.kratosClient = new FrontendApi(
      new Configuration({
        basePath: kratosPublicBaseUrl,
      })
    );
  }

  async validate(payload: IncomingMessage) {
    const apiAccessEnabled = this.configService.get(ConfigurationTypes.IDENTITY)
      .authentication.api_access_enabled;

    if (!apiAccessEnabled) {
      throw new ApiRestrictedAccessException('API access is restricted!');
    }

    const authorizationHeader: string | undefined =
      payload.headers.authorization;

    const bearerToken = authorizationHeader?.split(' ')[1];

    if (!bearerToken) {
      this.logger.verbose?.('Bearer token is not provided', LogContext.AUTH);
      return this.authService.createAgentInfo();
    }

    const { data } = await this.kratosClient.toSession({
      xSessionToken: bearerToken,
    });

    if (!data) {
      this.logger.verbose?.('No Ory Kratos API session', LogContext.AUTH);
      return this.authService.createAgentInfo();
    }

    const session = verifyIdentityIfOidcAuth(data);
    this.logger.verbose?.(session.identity, LogContext.AUTH);

    const oryIdentity = session.identity as OryDefaultIdentitySchema;
    return this.authService.createAgentInfo(oryIdentity);
  }
}
