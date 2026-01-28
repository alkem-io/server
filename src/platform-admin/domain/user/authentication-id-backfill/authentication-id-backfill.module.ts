import { AuthenticationAgentInfoModule } from '@core/authentication.agent.info/agent.info.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { UserModule } from '@domain/community/user/user.module';
import { Module } from '@nestjs/common';
import { KratosModule } from '@services/infrastructure/kratos/kratos.module';
import { PlatformAuthorizationPolicyModule } from '@src/platform/authorization/platform.authorization.policy.module';
import { AdminAuthenticationIDBackfillResolver } from './authentication-id-backfill.resolver';
import { AdminAuthenticationIDBackfillService } from './authentication-id-backfill.service';

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
