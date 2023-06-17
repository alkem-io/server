import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { NVPModule } from '@domain/common/nvp/nvp.module';
import { Application } from '@domain/community/application';
import { ApplicationService } from '@domain/community/application/application.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '@domain/community/user/user.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ApplicationResolverFields } from './application.resolver.fields';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ApplicationAuthorizationService } from './application.service.authorization';
import { ApplicationResolverMutations } from './application.resolver.mutations';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    NVPModule,
    LifecycleModule,
    UserModule,
    TypeOrmModule.forFeature([Application]),
  ],
  providers: [
    ApplicationService,
    ApplicationAuthorizationService,
    ApplicationResolverFields,
    ApplicationResolverMutations,
  ],
  exports: [
    ApplicationService,
    ApplicationAuthorizationService,
    ApplicationResolverMutations,
  ],
})
export class ApplicationModule {}
