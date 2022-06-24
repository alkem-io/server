import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Strategy } from 'passport-custom';
import { AuthenticationService } from './authentication.service';
import { Configuration, V0alpha2Api } from '@ory/kratos-client';
import { ConfigurationTypes, LogContext } from '@common/enums';
import { OryDefaultIdentitySchema } from './ory.default.identity.schema';

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

    const kratos = new V0alpha2Api(
      new Configuration({
        basePath: kratosPublicBaseUrl,
      })
    );

    let oryIdentity: OryDefaultIdentitySchema | undefined = undefined;
    const authorizationHeader = payload.headers.authorization;

    if (apiAccessEnabled && authorizationHeader) {
      const bearerToken = authorizationHeader.split(' ')[1];
      const { data: session } = await kratos.toSession(bearerToken);

      this.logger.verbose?.(session.identity, LogContext.AUTH);

      if (session) {
        oryIdentity = session.identity as OryDefaultIdentitySchema;
      }
    }
    return await this.authService.createAgentInfo(oryIdentity);
  }
}
