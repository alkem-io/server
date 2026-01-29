import { LogContext } from '@common/enums';
import { ApiRestrictedAccessException } from '@common/exceptions/auth';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Session } from '@ory/kratos-client';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { OryDefaultIdentitySchema } from '@services/infrastructure/kratos/types/ory.default.identity.schema';
import { AlkemioConfig } from '@src/types';
import { IncomingMessage } from 'http';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Strategy } from 'passport-custom';
import { AuthenticationService } from './authentication.service';
import { AUTH_STRATEGY_OATHKEEPER_API_TOKEN } from './strategy.names';
import { verifyIdentityIfOidcAuth } from './verify.identity.if.oidc.auth';

@Injectable()
export class OryApiStrategy extends PassportStrategy(
  Strategy,
  AUTH_STRATEGY_OATHKEEPER_API_TOKEN
) {
  constructor(
    private readonly configService: ConfigService<AlkemioConfig, true>,
    private readonly authService: AuthenticationService,
    private kratosService: KratosService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    super();
  }

  async validate(payload: IncomingMessage) {
    const apiAccessEnabled = this.configService.get(
      'identity.authentication.api_access_enabled',
      { infer: true }
    );

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

    const data: Session =
      await this.kratosService.getSessionFromBearerToken(bearerToken);

    if (!data) {
      this.logger.verbose?.('No Ory Kratos API session', LogContext.AUTH);
      return this.authService.createAgentInfo();
    }

    const session = verifyIdentityIfOidcAuth(data);
    this.logger.debug?.(session.identity, LogContext.AUTH);

    const oryIdentity = session.identity as OryDefaultIdentitySchema;
    return this.authService.createAgentInfo(oryIdentity, session);
  }
}
