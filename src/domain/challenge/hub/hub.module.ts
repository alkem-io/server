import { ChallengeModule } from '@domain/challenge/challenge/challenge.module';
import { ContextModule } from '@domain/context/context/context.module';
import { OrganizationModule } from '@domain/community/organization/organization.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hub } from '@domain/challenge/hub/hub.entity';
import { HubResolverMutations } from '@domain/challenge/hub/hub.resolver.mutations';
import { HubResolverQueries } from '@domain/challenge/hub/hub.resolver.queries';
import { HubService } from '@domain/challenge/hub/hub.service';
import { HubResolverFields } from '@domain/challenge/hub/hub.resolver.fields';
import { CommunityModule } from '@domain/community/community/community.module';
import { ProjectModule } from '@domain/collaboration/project/project.module';
import { UserGroupModule } from '@domain/community/user-group/user-group.module';
import { ApplicationModule } from '@domain/community/application/application.module';
import { OpportunityModule } from '@domain/collaboration/opportunity/opportunity.module';
import { BaseChallengeModule } from '@domain/challenge/base-challenge/base.challenge.module';
import { NamingModule } from '@src/services/domain/naming/naming.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { HubAuthorizationService } from '@domain/challenge/hub/hub.service.authorization';
import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { UserModule } from '@domain/community/user/user.module';
import { PreferenceModule } from '@domain/common/preference';
import { PreferenceSetModule } from '@domain/common/preference-set/preference.set.module';
import { AspectModule } from '@domain/context/aspect/aspect.module';
import { TemplatesSetModule } from '@domain/template/templates-set/templates.set.module';

@Module({
  imports: [
    AgentModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    ContextModule,
    CommunityModule,
    ChallengeModule,
    BaseChallengeModule,
    LifecycleModule,
    OpportunityModule,
    ProjectModule,
    OrganizationModule,
    TagsetModule,
    UserGroupModule,
    ApplicationModule,
    UserModule,
    NamingModule,
    PreferenceModule,
    PreferenceSetModule,
    TemplatesSetModule,
    AspectModule,
    TypeOrmModule.forFeature([Hub]),
  ],
  providers: [
    HubService,
    HubAuthorizationService,
    HubResolverFields,
    HubResolverQueries,
    HubResolverMutations,
  ],
  exports: [HubService, HubAuthorizationService],
})
export class HubModule {}
