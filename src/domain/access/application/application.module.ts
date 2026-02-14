import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ApplicationService } from '@domain/access/application/application.service';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { NVPModule } from '@domain/common/nvp/nvp.module';
import { UserModule } from '@domain/community/user/user.module';
import { Module } from '@nestjs/common';
import { RoleSetCacheModule } from '../role-set/role.set.service.cache.module';
import { ApplicationResolverFields } from './application.resolver.fields';
import { ApplicationLifecycleResolverFields } from './application.resolver.fields.lifecycle';
import { ApplicationResolverMutations } from './application.resolver.mutations';
import { ApplicationAuthorizationService } from './application.service.authorization';
import { ApplicationLifecycleService } from './application.service.lifecycle';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    NVPModule,
    LifecycleModule,
    UserModule,
    RoleSetCacheModule,
  ],
  providers: [
    ApplicationService,
    ApplicationAuthorizationService,
    ApplicationResolverFields,
    ApplicationResolverMutations,
    ApplicationLifecycleResolverFields,
    ApplicationLifecycleService,
  ],
  exports: [
    ApplicationService,
    ApplicationAuthorizationService,
    ApplicationResolverMutations,
  ],
})
export class ApplicationModule {}
