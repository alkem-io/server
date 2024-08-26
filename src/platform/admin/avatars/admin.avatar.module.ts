import { Module } from '@nestjs/common';
import { ContributorModule } from '@domain/community/contributor/contributor.module';
import { AdminSearchContributorsMutations } from './admin.avatarresolver.mutations';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';

@Module({
  imports: [AuthorizationModule, AuthorizationPolicyModule, ContributorModule],
  providers: [AdminSearchContributorsMutations],
  exports: [],
})
export class AdminContributorsModule {}
