import { AuthenticationModule } from '@core/authentication/authentication.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { IdentityResolveModule } from '@services/api-rest/identity-resolve/identity-resolve.module';
import { KratosModule } from '@services/infrastructure/kratos/kratos.module';
import { NonInteractiveLoginAuditService } from './non-interactive-login.audit';
import { NonInteractiveLoginConfig } from './non-interactive-login.config';
import { NonInteractiveLoginController } from './non-interactive-login.controller';
import { NonInteractiveLoginService } from './non-interactive-login.service';
import { NonInteractiveLoginStrategy } from './non-interactive-login.strategy';

/**
 * Non-interactive login feature.
 *
 * The module is always loaded (so passport always knows about the
 * `non-interactive-login` strategy and never throws "Unknown authentication
 * strategy"). Whether the feature actually accepts or issues tokens is
 * decided at request time by `NonInteractiveLoginConfig.enabled`:
 *   - `NonInteractiveLoginStrategy.validate()` returns null when disabled.
 *   - `NonInteractiveLoginController.mint()` throws 404 when disabled.
 *
 * Boot-time `NonInteractiveLoginConfig.assertSafe()` (called from main.ts)
 * refuses to start the process if `NODE_ENV=production` collides with the
 * feature settings.
 */
@Module({
  imports: [
    ConfigModule,
    PassportModule,
    AuthenticationModule,
    KratosModule,
    IdentityResolveModule,
  ],
  controllers: [NonInteractiveLoginController],
  providers: [
    NonInteractiveLoginConfig,
    NonInteractiveLoginAuditService,
    NonInteractiveLoginService,
    NonInteractiveLoginStrategy,
  ],
  exports: [NonInteractiveLoginConfig, NonInteractiveLoginStrategy],
})
export class NonInteractiveLoginModule {}
