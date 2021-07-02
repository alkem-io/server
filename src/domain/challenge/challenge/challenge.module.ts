import { ContextModule } from '@domain/context/context/context.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Challenge } from './challenge.entity';
import { ChallengeResolverFields } from './challenge.resolver.fields';
import { ChallengeResolverMutations } from './challenge.resolver.mutations';
import { ChallengeService } from './challenge.service';
import { CommunityModule } from '@domain/community/community/community.module';
import { OrganisationModule } from '@domain/community/organisation/organisation.module';
import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { OpportunityModule } from '@domain/collaboration/opportunity/opportunity.module';
import { BaseChallengeModule } from '@domain/challenge/base-challenge/base.challenge.module';
import { ChallengeLifecycleOptionsProvider } from '@domain/challenge/challenge/challenge.lifecycle.options.provider';
import { NamingModule } from '@src/services/domain/naming/naming.module';
import { ChallengeAuthorizationService } from '@domain/challenge/challenge/challenge.service.authorization';
import { AuthorizationEngineModule } from '@src/services/platform/authorization-engine/authorization-engine.module';
import { AuthorizationDefinitionModule } from '@domain/common/authorization-definition/authorization.definition.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { ProjectModule } from '@domain/collaboration/project/project.module';
import { SsiAgentModule } from '@services/platform/ssi/agent/ssi.agent.module';
import { UserModule } from '@domain/community/user/user.module';

@Module({
  imports: [
    AgentModule,
    AuthorizationDefinitionModule,
    AuthorizationEngineModule,
    ContextModule,
    BaseChallengeModule,
    CommunityModule,
    OpportunityModule,
    TagsetModule,
    OrganisationModule,
    NamingModule,
    LifecycleModule,
    ProjectModule,
    SsiAgentModule,
    UserModule,
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
