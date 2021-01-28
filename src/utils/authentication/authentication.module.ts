import { forwardRef, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AadOboStrategy } from './aad.obo.strategy';
import { UserModule } from '@domain/user/user.module';
import { SessionSerializer } from './session.serializer';
import { OidcStrategy } from './oidc.strategy';
import { AuthService } from './auth.service';
@Module({
  imports: [
    PassportModule.register({ session: false, defaultStrategy: 'bearer' }),
    forwardRef(() => UserModule),
  ],
  providers: [SessionSerializer, AadOboStrategy, OidcStrategy, AuthService],
  exports: [AadOboStrategy],
})
export class AuthenticationModule {}
