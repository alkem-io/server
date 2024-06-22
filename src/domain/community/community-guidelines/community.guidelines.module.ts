import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunityGuidelines } from './community.guidelines.entity';
import { CommunityGuidelinesService } from './community.guidelines.service';
import { CommunityGuidelinesAuthorizationService } from './community.guidelines.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { CommunityGuidelinesResolverMutations } from './community.guidelines.resolver.mutations';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    ProfileModule,
    TypeOrmModule.forFeature([CommunityGuidelines]),
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
