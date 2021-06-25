import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Strategy } from 'passport-custom';
import { AuthenticationService } from './authentication.service';
import { Configuration, PublicApi } from '@ory/kratos-client';
import { ConfigurationTypes, LogContext } from '@common/enums';

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
      ConfigurationTypes.Identity
    ).authentication.providers.ory.kratos_public_base_url;

    const apiAccessEnabled = this.configService.get(ConfigurationTypes.Identity)
      .authentication.api_access_enabled;

    const kratos = new PublicApi(
      new Configuration({
        basePath: kratosPublicBaseUrl,
      })
    );

    let identifier = '';
    const authorizationHeader = payload.headers.authorization;
    if (apiAccessEnabled && authorizationHeader) {
      const bearerToken = authorizationHeader.split(' ')[1];
      const user = await kratos.toSession(bearerToken);

      this.logger.verbose?.('Whoami', LogContext.AUTH);
      this.logger.verbose?.(user.data.identity, LogContext.AUTH);

      if (user) {
        identifier = user.data.identity.traits.email;
      }
    }
    return await this.authService.createAgentInfo(identifier);
  }
}
