import { ContextModule } from '@domain/context/context/context.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Challenge } from './challenge.entity';
import { ChallengeResolverFields } from './challenge.resolver.fields';
import { ChallengeResolverMutations } from './challenge.resolver.mutations';
import { ChallengeService } from './challenge.service';
import { CommunityModule } from '@domain/community/community/community.module';
import { OrganizationModule } from '@domain/community/organization/organization.module';
import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { OpportunityModule } from '@domain/collaboration/opportunity/opportunity.module';
import { BaseChallengeModule } from '@domain/challenge/base-challenge/base.challenge.module';
import { ChallengeLifecycleOptionsProvider } from '@domain/challenge/challenge/challenge.lifecycle.options.provider';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { ChallengeAuthorizationService } from '@domain/challenge/challenge/challenge.service.authorization';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { ProjectModule } from '@domain/collaboration/project/project.module';
import { UserModule } from '@domain/community/user/user.module';
import { PreferenceModule } from '@domain/common/preference';
import { PreferenceSetModule } from '@domain/common/preference-set/preference.set.module';
import { LifecycleTemplateModule } from '@domain/template/lifecycle-template/lifecycle.template.module';

@Module({
  imports: [
    AgentModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    ContextModule,
    BaseChallengeModule,
    CommunityModule,
    OpportunityModule,
    TagsetModule,
    OrganizationModule,
    NamingModule,
    LifecycleModule,
    LifecycleTemplateModule,
    ProjectModule,
    UserModule,
    PreferenceModule,
    PreferenceSetModule,
    TypeOrmModule.forFeature([Challenge]),
  ],
  providers: [
    ChallengeService,
    ChallengeAuthorizationService,
    ChallengeResolverMutations,
    ChallengeResolverFields,
    ChallengeLifecycleOptionsProvider,
  ],
  exports: [ChallengeService, ChallengeAuthorizationService],
})
export class ChallengeModule {}
