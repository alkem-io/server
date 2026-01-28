import { AuthenticationAgentInfoModule } from '@core/authentication.agent.info/agent.info.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { Module } from '@nestjs/common';
import { RegistrationModule } from '@services/api/registration/registration.module';
import { KratosModule } from '@services/infrastructure/kratos/kratos.module';
import { IdentityResolveController } from './identity-resolve.controller';
import { IdentityResolveService } from './identity-resolve.service';

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
