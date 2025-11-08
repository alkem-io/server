import { Module } from '@nestjs/common';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { RegistrationModule } from '@services/api/registration/registration.module';
import { UserModule } from '@domain/community/user/user.module';
import { KratosModule } from '@services/infrastructure/kratos/kratos.module';
import { AuthenticationModule } from '@core/authentication/authentication.module';
import { IdentityResolutionController } from './identity-resolution.controller';
import {
  IdentityResolutionMetrics,
  IdentityResolutionService,
} from './identity-resolution.service';
import { PrometheusIdentityResolutionMetrics } from './identity-resolution.metrics';

@Module({
  imports: [
    UserLookupModule,
    RegistrationModule,
    UserModule,
    KratosModule,
    AuthenticationModule,
  ],
  controllers: [IdentityResolutionController],
  providers: [
    IdentityResolutionService,
    {
      provide: IdentityResolutionMetrics,
      useClass: PrometheusIdentityResolutionMetrics,
    },
  ],
  exports: [IdentityResolutionService],
})
export class IdentityResolutionModule {}
