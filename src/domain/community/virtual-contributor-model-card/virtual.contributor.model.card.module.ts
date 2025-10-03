import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { VirtualContributorModelCardResolverFields } from './virtual.contributor.model.card.resolver.fields';

@Module({
  imports: [AuthorizationPolicyModule, AuthorizationModule],
  providers: [VirtualContributorModelCardResolverFields],
  exports: [],
})
export class VirtualContributorModelCardModule {}
