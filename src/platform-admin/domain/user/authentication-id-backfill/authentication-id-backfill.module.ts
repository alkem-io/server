import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { PlatformAuthorizationPolicyModule } from '@src/platform/authorization/platform.authorization.policy.module';
import { KratosModule } from '@services/infrastructure/kratos/kratos.module';
import { UserModule } from '@domain/community/user/user.module';
import { AuthenticationAgentInfoModule } from '@core/authentication.agent.info/agent.info.module';
import { AdminAuthenticationIDBackfillService } from './authentication-id-backfill.service';
import { AdminAuthenticationIDBackfillResolver } from './authentication-id-backfill.resolver';

@Module({
  imports: [
    AuthorizationModule,
    PlatformAuthorizationPolicyModule,
    KratosModule,
    UserModule,
    AuthenticationAgentInfoModule,
  ],
  providers: [
    AdminAuthenticationIDBackfillService,
    AdminAuthenticationIDBackfillResolver,
  ],
  exports: [AdminAuthenticationIDBackfillService],
})
export class AdminAuthenticationIDBackfillModule {}
