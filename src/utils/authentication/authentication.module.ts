import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { OidcStrategy, buildOpenIdClient } from './oidc.strategy';
import { AuthService } from './auth.service';
import { AadOboStrategy } from './aad.obo.strategy';
import { UserModule } from '@domain/user/user.module';
import { SessionSerializer } from './session.serializer';

const OidcStrategyFactory = {
  provide: 'OidcStrategy',
  useFactory: async (authService: AuthService) => {
    const client = await buildOpenIdClient(); // secret sauce! build the dynamic client before injecting it into the strategy for use in the constructor super call.
    const strategy = new OidcStrategy(authService, client);
    return strategy;
  },
  inject: [AuthService],
};

@Module({
  imports: [
    PassportModule.register({ session: true, defaultStrategy: 'oidc' }),
    UserModule,
  ],
  providers: [
    OidcStrategyFactory,
    SessionSerializer,
    AuthService,
    AadOboStrategy,
  ],
  exports: [AadOboStrategy],
})
export class AuthenticationModule {}
