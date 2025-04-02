import { LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config/dist';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { AuthenticationService } from './authentication.service';
import { passportJwtSecret } from 'jwks-rsa';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { verifyIdentityIfOidcAuth } from './verify.identity.if.oidc.auth';
import { AgentInfo } from '../authentication.agent.info/agent.info';
import { AlkemioConfig } from '@src/types';
import { OryDefaultIdentitySchema } from '@services/infrastructure/kratos/types/ory.default.identity.schema';
import { KratosPayload } from '@services/infrastructure/kratos/types/kratos.payload';
import { AUTH_STRATEGY_OATHKEEPER_JWT } from './strategy.names';

@Injectable()
export class OryStrategy extends PassportStrategy(
  Strategy,
  AUTH_STRATEGY_OATHKEEPER_JWT
) {
  constructor(
    private readonly configService: ConfigService<AlkemioConfig, true>,
    private readonly authService: AuthenticationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: configService.get(
          'identity.authentication.providers.ory.jwks_uri',
          { infer: true }
        ),
      }),
      issuer: configService.get(
        'identity.authentication.providers.ory.issuer',
        { infer: true }
      ),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
    });
  }

  async validate(payload: KratosPayload): Promise<AgentInfo | null> {
    this.logger.debug?.('Ory Strategy: Kratos payload', LogContext.AUTH);
    this.logger.debug?.(payload, LogContext.AUTH);

    if (!payload.session) {
      this.logger.verbose?.('No Ory Kratos session', LogContext.AUTH);
      return this.authService.createAgentInfo();
    }

    const session = verifyIdentityIfOidcAuth(payload.session);
    const oryIdentity = session.identity as OryDefaultIdentitySchema;

    return this.authService.createAgentInfo(oryIdentity, session);
  }
}
