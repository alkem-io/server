import { ContextModule } from '@domain/context/context/context.module';
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
import { ChallengeResolverSubscriptions } from './challenge.resolver.subscriptions';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';
import { CommunityPolicyModule } from '@domain/community/community-policy/community.policy.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { ElasticsearchModule } from '@services/external/elasticsearch';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { LoaderCreatorModule } from '@core/dataloader/creators';
import { InnovationFlowTemplateModule } from '@domain/template/innovation-flow-template/innovation.flow.template.module';
import { StorageSpaceModule } from '@domain/storage/storage-space/storage.space.module';

@Module({
  imports: [
    EntityResolverModule,
    ActivityAdapterModule,
    AgentModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    ContextModule,
    BaseChallengeModule,
    CommunityModule,
    CommunityPolicyModule,
    OpportunityModule,
    OrganizationModule,
    NamingModule,
    LifecycleModule,
    InnovationFlowTemplateModule,
    PlatformAuthorizationPolicyModule,
    ProjectModule,
    UserModule,
    PreferenceModule,
    PreferenceSetModule,
    ElasticsearchModule,
    TypeOrmModule.forFeature([Challenge]),
    LoaderCreatorModule,
    StorageSpaceModule,
  ],
  providers: [
    ChallengeService,
    ChallengeAuthorizationService,
    ChallengeResolverMutations,
    ChallengeResolverFields,
    ChallengeLifecycleOptionsProvider,
    ChallengeResolverSubscriptions,
  ],
  exports: [ChallengeService, ChallengeAuthorizationService],
})
export class ChallengeModule {}
