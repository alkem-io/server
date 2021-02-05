import { forwardRef, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UserModule } from '@domain/user/user.module';
import { OidcBearerStrategy } from './oidc.bearer.strategy';
import { AuthService } from './auth.service';
@Module({
  imports: [
    PassportModule.register({ session: false, defaultStrategy: 'bearer' }),
    forwardRef(() => UserModule),
  ],
  providers: [OidcBearerStrategy, AuthService],
})
export class AuthModule {}
