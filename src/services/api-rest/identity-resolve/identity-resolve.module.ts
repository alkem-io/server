import { Module } from '@nestjs/common';
import { IdentityResolveController } from './identity-resolve.controller';
import { IdentityResolveService } from './identity-resolve.service';
import { RegistrationModule } from '@services/api/registration/registration.module';
import { KratosModule } from '@services/infrastructure/kratos/kratos.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { AuthenticationAgentInfoModule } from '@core/authentication.agent.info/agent.info.module';

@Module({
  imports: [
    RegistrationModule,
    KratosModule,
    UserLookupModule,
    AuthenticationAgentInfoModule,
  ],
  controllers: [IdentityResolveController],
  providers: [IdentityResolveService],
  exports: [IdentityResolveService],
})
export class IdentityResolveModule {}
