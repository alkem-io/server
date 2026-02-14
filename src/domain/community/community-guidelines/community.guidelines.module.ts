import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { Module } from '@nestjs/common';
import { CommunityGuidelinesResolverMutations } from './community.guidelines.resolver.mutations';
import { CommunityGuidelinesService } from './community.guidelines.service';
import { CommunityGuidelinesAuthorizationService } from './community.guidelines.service.authorization';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    ProfileModule,
    TagsetModule,
  ],
  providers: [
    CommunityGuidelinesService,
    CommunityGuidelinesAuthorizationService,
    CommunityGuidelinesResolverMutations,
  ],
  exports: [
    CommunityGuidelinesService,
    CommunityGuidelinesAuthorizationService,
  ],
})
export class CommunityGuidelinesModule {}
