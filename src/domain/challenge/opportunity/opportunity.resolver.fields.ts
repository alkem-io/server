import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthorizationAgentPrivilege,
  CurrentUser,
} from '@src/common/decorators';
import { IOpportunity } from './opportunity.interface';
import { OpportunityService } from './opportunity.service';
import { IContext } from '@domain/context/context/context.interface';
import { ICommunity } from '@domain/community/community/community.interface';
import { INVP } from '@domain/common/nvp/nvp.interface';
import { AuthorizationPrivilege } from '@common/enums';
import { UseGuards } from '@nestjs/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
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
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { AgentInfo } from '@core/authentication/agent-info';
import { AuthorizationService } from '@core/authorization/authorization.service';

@Resolver(() => IOpportunity)
export class OpportunityResolverFields {
  constructor(
    private opportunityService: OpportunityService,
    private authorizationService: AuthorizationService
  ) {}

  // Check authorization inside the field resolver
  @UseGuards(GraphqlGuard)
  @ResolveField('community', () => ICommunity, {
    nullable: true,
    description: 'The community for the Opportunity.',
  })
  async community(
    @Parent() opportunity: IOpportunity,
    @Loader(JourneyCommunityLoaderCreator, { parentClassRef: Opportunity })
    loader: ILoader<ICommunity>
  ) {
    const community = await loader.load(opportunity.id);
    // Do not check for READ access here, rely on per field check on resolver in Community
    // await this.authorizationService.grantAccessOrFail(
    //   agentInfo,
    //   community.authorization,
    //   AuthorizationPrivilege.READ,
    //   `read community on space: ${community.id}`
    // );
    return community;
  }

  // Check authorization inside the field resolver
  @UseGuards(GraphqlGuard)
  @ResolveField('context', () => IContext, {
    nullable: true,
    description: 'The context for the Opportunity.',
  })
  async context(
    @Parent() opportunity: IOpportunity,
    @CurrentUser() agentInfo: AgentInfo,
    @Loader(JourneyContextLoaderCreator, { parentClassRef: Opportunity })
    loader: ILoader<IContext>
  ) {
    const context = await loader.load(opportunity.id);
    // Check if the user can read the Context entity, not the space
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      context.authorization,
      AuthorizationPrivilege.READ,
      `read context on opportunity: ${context.id}`
    );
    return context;
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('storageAggregator', () => IStorageAggregator, {
    nullable: true,
    description: 'The StorageAggregator in use by this Opportunity',
  })
  async storageAggregator(
    @Parent() opportunity: IOpportunity
  ): Promise<IStorageAggregator> {
    return await this.opportunityService.getStorageAggregatorOrFail(
      opportunity.id
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('collaboration', () => ICollaboration, {
    nullable: true,
    description: 'The collaboration for the Opportunity.',
  })
  async collaboration(
    @Parent() opportunity: IOpportunity,
    @Loader(JourneyCollaborationLoaderCreator, { parentClassRef: Opportunity })
    loader: ILoader<ICollaboration>
  ) {
    return loader.load(opportunity.id);
  }

  // Check authorization inside the field resolver
  @UseGuards(GraphqlGuard)
  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for the Opportunity.',
  })
  async profile(
    @Parent() opportunity: IOpportunity,
    @CurrentUser() agentInfo: AgentInfo
  ) {
    const profile = await this.opportunityService.getProfile(opportunity);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      profile.authorization,
      AuthorizationPrivilege.READ,
      `read profile on opportunity: ${profile.displayName}`
    );
    return profile;
  }

  @ResolveField('metrics', () => [INVP], {
    nullable: true,
    description: 'Metrics about the activity within this Opportunity.',
  })
  async metrics(@Parent() opportunity: IOpportunity) {
    return await this.opportunityService.getMetrics(opportunity);
  }

  @ResolveField('parentNameID', () => String, {
    nullable: true,
    description: 'The parent entity name (challenge) ID.',
  })
  async parentNameID(
    @Parent() opportunity: IOpportunity,
    @Loader(OpportunityParentNameLoaderCreator)
    loader: ILoader<string>
  ) {
    return loader.load(opportunity.id);
  }
}
