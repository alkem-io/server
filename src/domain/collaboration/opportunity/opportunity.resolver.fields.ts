import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';
import { IOpportunity } from './opportunity.interface';
import { OpportunityService } from './opportunity.service';
import { IContext } from '@domain/context/context/context.interface';
import { ICommunity } from '@domain/community/community/community.interface';
import { INVP } from '@domain/common/nvp/nvp.interface';
import { AuthorizationPrivilege } from '@common/enums';
import { UseGuards } from '@nestjs/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { ICollaboration } from '../collaboration/collaboration.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { Opportunity } from './opportunity.entity';
import { Loader } from '@core/dataloader/decorators';
import {
  JourneyCollaborationLoaderCreator,
  JourneyCommunityLoaderCreator,
  JourneyContextLoaderCreator,
  OpportunityParentNameLoaderCreator,
} from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { IInnovationFlow } from '@domain/challenge/innovation-flow/innovation.flow.interface';

@Resolver(() => IOpportunity)
export class OpportunityResolverFields {
  constructor(private opportunityService: OpportunityService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('innovationFlow', () => IInnovationFlow, {
    nullable: true,
    description: 'The InnovationFlow for the Opportunity.',
  })
  @Profiling.api
  async innovationFlow(@Parent() opportunity: IOpportunity) {
    return await this.opportunityService.getInnovationFlow(opportunity.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('community', () => ICommunity, {
    nullable: true,
    description: 'The community for the Opportunity.',
  })
  @Profiling.api
  async community(
    @Parent() opportunity: IOpportunity,
    @Loader(JourneyCommunityLoaderCreator, { parentClassRef: Opportunity })
    loader: ILoader<ICommunity>
  ) {
    return loader.load(opportunity.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('context', () => IContext, {
    nullable: true,
    description: 'The context for the Opportunity.',
  })
  @Profiling.api
  async context(
    @Parent() opportunity: IOpportunity,
    @Loader(JourneyContextLoaderCreator, { parentClassRef: Opportunity })
    loader: ILoader<IContext>
  ) {
    return loader.load(opportunity.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('collaboration', () => ICollaboration, {
    nullable: true,
    description: 'The collaboration for the Opportunity.',
  })
  @Profiling.api
  async collaboration(
    @Parent() opportunity: IOpportunity,
    @Loader(JourneyCollaborationLoaderCreator, { parentClassRef: Opportunity })
    loader: ILoader<ICollaboration>
  ) {
    return loader.load(opportunity.id);
  }

  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for the Opportunity.',
  })
  @Profiling.api
  async profile(@Parent() opportunity: IOpportunity) {
    return await this.opportunityService.getProfile(opportunity);
  }

  @ResolveField('metrics', () => [INVP], {
    nullable: true,
    description: 'Metrics about the activity within this Opportunity.',
  })
  @Profiling.api
  async metrics(@Parent() opportunity: IOpportunity) {
    return await this.opportunityService.getMetrics(opportunity);
  }

  @ResolveField('parentNameID', () => String, {
    nullable: true,
    description: 'The parent entity name (challenge) ID.',
  })
  @Profiling.api
  async parentNameID(
    @Parent() opportunity: IOpportunity,
    @Loader(OpportunityParentNameLoaderCreator)
    loader: ILoader<string>
  ) {
    return loader.load(opportunity.id);
  }
}
