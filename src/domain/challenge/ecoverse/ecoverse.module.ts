import { ChallengeModule } from '@domain/challenge/challenge/challenge.module';
import { ContextModule } from '@domain/context/context/context.module';
import { OrganisationModule } from '@domain/community/organisation/organisation.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ecoverse } from '@domain/challenge/ecoverse/ecoverse.entity';
import { EcoverseResolverMutations } from '@domain/challenge/ecoverse/ecoverse.resolver.mutations';
import { EcoverseResolverQueries } from '@domain/challenge/ecoverse/ecoverse.resolver.queries';
import { EcoverseService } from '@domain/challenge/ecoverse/ecoverse.service';
import { EcoverseResolverFields } from '@domain/challenge/ecoverse/ecoverse.resolver.fields';
import { CommunityModule } from '@domain/community/community/community.module';
import { ProjectModule } from '@domain/collaboration/project/project.module';
import { UserGroupModule } from '@domain/community/user-group/user-group.module';
import { ApplicationModule } from '@domain/community/application/application.module';
import { OpportunityModule } from '@domain/collaboration/opportunity/opportunity.module';
import { BaseChallengeModule } from '@domain/challenge/base-challenge/base.challenge.module';
import { NamingModule } from '@src/services/domain/naming/naming.module';
import { AuthorizationEngineModule } from '@src/services/platform/authorization-engine/authorization-engine.module';
import { EcoverseAuthorizationService } from '@domain/challenge/ecoverse/ecoverse.service.authorization';
import { LifecycleModule } from '@domain/common/lifecycle/lifecycle.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { AgentModule } from '@domain/agent/agent/agent.module';

@Module({
  imports: [
    AgentModule,
    AuthorizationPolicyModule,
    AuthorizationEngineModule,
    ContextModule,
    CommunityModule,
    ChallengeModule,
    BaseChallengeModule,
    LifecycleModule,
    OpportunityModule,
    ProjectModule,
    OrganisationModule,
    TagsetModule,
    UserGroupModule,
    ApplicationModule,
    NamingModule,
    TypeOrmModule.forFeature([Ecoverse]),
  ],
  providers: [
    EcoverseService,
    EcoverseAuthorizationService,
    EcoverseResolverFields,
    EcoverseResolverQueries,
    EcoverseResolverMutations,
  ],
  exports: [EcoverseService, EcoverseAuthorizationService],
})
export class EcoverseModule {}
