import { Module } from '@nestjs/common';
import { IdentityResolveController } from './identity-resolve.controller';
import { IdentityResolveService } from './identity-resolve.service';
import { RegistrationModule } from '@services/api/registration/registration.module';
import { KratosModule } from '@services/infrastructure/kratos/kratos.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';

@Module({
  imports: [RegistrationModule, KratosModule, UserLookupModule],
  controllers: [IdentityResolveController],
  providers: [IdentityResolveService],
  exports: [IdentityResolveService],
})
export class IdentityResolveModule {}
