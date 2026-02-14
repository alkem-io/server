import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { AuthorizationPolicyModule } from '../authorization-policy/authorization.policy.module';
import { TagsetResolverFields } from './tagset.resolver.fields';
import { TagsetResolverMutations } from './tagset.resolver.mutations';
import { TagsetService } from './tagset.service';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
  ],
  providers: [TagsetService, TagsetResolverFields, TagsetResolverMutations],
  exports: [TagsetService],
})
export class TagsetModule {}
