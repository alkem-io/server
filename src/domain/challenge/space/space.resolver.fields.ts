import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { Space } from '@domain/challenge/space/space.entity';
import { INVP } from '@domain/common/nvp';
import { UUID, UUID_NAMEID } from '@domain/common/scalars';
import { IOrganization } from '@domain/community/organization';
import { ICommunity } from '@domain/community/community';
import { IUserGroup } from '@domain/community/user-group';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { IContext } from '@domain/context/context';
import { UseGuards } from '@nestjs/common';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthorizationAgentPrivilege,
  CurrentUser,
} from '@src/common/decorators';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { SpaceService } from '@domain/challenge/space/space.service';
import { ISpace } from '@domain/challenge/space/space.interface';
import { IOpportunity } from '@domain/challenge/opportunity';
import { IAgent } from '@domain/agent/agent';
import { IPreference } from '@domain/common/preference/preference.interface';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { LimitAndShuffleIdsQueryArgs } from '@domain/common/query-args/limit-and-shuffle.ids.query.args';
import { IProfile } from '@domain/common/profile';
import { Loader } from '@core/dataloader/decorators';
import {
  JourneyCollaborationLoaderCreator,
  JourneyCommunityLoaderCreator,
  JourneyContextLoaderCreator,
  PreferencesLoaderCreator,
  AgentLoaderCreator,
  ProfileLoaderCreator,
} from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication/agent-info';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';

@Resolver(() => ISpace)
export class SpaceResolverFields {
  constructor(
    private groupService: UserGroupService,
    private spaceService: SpaceService,
    private authorizationService: AuthorizationService
  ) {}

  // Check authorization inside the field resolver directly on the Community
  @UseGuards(GraphqlGuard)
  @ResolveField('community', () => ICommunity, {
    nullable: true,
    description: 'Get the Community for the Space. ',
  })
  async community(
    @Parent() space: Space,
    @Loader(JourneyCommunityLoaderCreator, { parentClassRef: Space })
    loader: ILoader<ICommunity>
  ): Promise<ICommunity> {
    const community = await loader.load(space.id);
    // Do not check for READ access here, rely on per field check on resolver in Community
    // await this.authorizationService.grantAccessOrFail(
    //   agentInfo,
    //   community.authorization,
    //   AuthorizationPrivilege.READ,
    //   `read community on space: ${community.id}`
    // );
    return community;
  }

  // Check authorization inside the field resolver directly on the Context
  @UseGuards(GraphqlGuard)
  @ResolveField('context', () => IContext, {
    nullable: true,
    description: 'The context for the space.',
  })
  async context(
    @Parent() space: Space,
    @CurrentUser() agentInfo: AgentInfo,
    @Loader(JourneyContextLoaderCreator, { parentClassRef: Space })
    loader: ILoader<IContext>
  ): Promise<IContext> {
    const context = await loader.load(space.id);
    // Check if the user can read the Context entity, not the space
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      context.authorization,
      AuthorizationPrivilege.READ,
      `read context on space: ${context.id}`
    );
    return context;
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('collaboration', () => ICollaboration, {
    nullable: true,
    description: 'The collaboration for the Space.',
  })
  async collaboration(
    @Parent() space: Space,
    @Loader(JourneyCollaborationLoaderCreator, { parentClassRef: Space })
    loader: ILoader<IContext>
  ): Promise<ICollaboration> {
    return loader.load(space.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('agent', () => IAgent, {
    nullable: true,
    description: 'The Agent representing this Space.',
  })
  async agent(
    @Parent() space: Space,
    @Loader(AgentLoaderCreator, { parentClassRef: Space })
    loader: ILoader<IAgent>
  ): Promise<IAgent> {
    return loader.load(space.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('storageAggregator', () => IStorageAggregator, {
    nullable: true,
    description: 'The StorageAggregator in use by this Space',
  })
  async storageAggregator(@Parent() space: Space): Promise<IStorageAggregator> {
    return await this.spaceService.getStorageAggregatorOrFail(space.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('preferences', () => [IPreference], {
    nullable: true,
    description: 'The preferences for this Space',
  })
  async preferences(
    @Parent() space: Space,
    @Loader(PreferencesLoaderCreator, {
      parentClassRef: Space,
      getResult: r => r?.preferenceSet?.preferences,
    })
    loader: ILoader<IPreference[]>
  ): Promise<IPreference[]> {
    return loader.load(space.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('challenges', () => [IChallenge], {
    nullable: true,
    description: 'The challenges for the space.',
  })
  async challenges(
    @Parent() space: Space,
    @Args({ nullable: true }) args: LimitAndShuffleIdsQueryArgs
  ): Promise<IChallenge[]> {
    return await this.spaceService.getChallenges(space, args);
  }

  // Check authorization inside the field resolver
  @UseGuards(GraphqlGuard)
  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for the Space.',
  })
  async profile(
    @Parent() space: Space,
    @CurrentUser() agentInfo: AgentInfo,
    @Loader(ProfileLoaderCreator, { parentClassRef: Space })
    loader: ILoader<IProfile>
  ): Promise<IProfile> {
    const profile = await loader.load(space.id);
    // Check if the user can read the profile entity, not the space
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      profile.authorization,
      AuthorizationPrivilege.READ,
      `read profile on space: ${profile.displayName}`
    );
    return profile;
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('challenge', () => IChallenge, {
    nullable: false,
    description: 'A particular Challenge, either by its ID or nameID',
  })
  async challenge(
    @Args('ID', { type: () => UUID_NAMEID }) id: string,
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() space: Space
  ): Promise<IChallenge> {
    const challenge = await this.spaceService.getChallengeInAccount(id, space);
    if (!challenge) {
      throw new EntityNotFoundException(
        `Unable to find challenge with ID: '${id}'`,
        LogContext.CHALLENGES,
        { challengeId: id, spaceId: space.id, userId: agentInfo.userID }
      );
    }
    return challenge;
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('opportunity', () => IOpportunity, {
    nullable: false,
    description: 'A particular Opportunity, either by its ID or nameID',
  })
  async opportunity(
    @Args('ID', { type: () => UUID_NAMEID }) id: string,
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() space: Space
  ): Promise<IOpportunity> {
    const opportunity = await this.spaceService.getOpportunityInAccount(
      id,
      space
    );
    if (!opportunity) {
      throw new EntityNotFoundException(
        `Unable to find Opportunity with ID: '${id}'`,
        LogContext.CHALLENGES,
        { opportunityId: id, spaceId: space.id, userId: agentInfo.userID }
      );
    }
    return opportunity;
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('groups', () => [IUserGroup], {
    nullable: false,
    description: 'The User Groups on this Space',
  })
  async groups(@Parent() space: Space): Promise<IUserGroup[]> {
    return await this.groupService.getGroups({
      where: { spaceID: space.id },
    });
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('group', () => IUserGroup, {
    nullable: false,
    description: 'The user group with the specified id anywhere in the space',
  })
  async group(
    @Parent() space: Space,
    @Args('ID', { type: () => UUID }) groupID: string
  ): Promise<IUserGroup> {
    return await this.groupService.getUserGroupOrFail(groupID, {
      where: { spaceID: space.id },
    });
  }

  @ResolveField('metrics', () => [INVP], {
    nullable: true,
    description: 'Metrics about activity within this Space.',
  })
  async metrics(@Parent() space: Space) {
    return await this.spaceService.getMetrics(space);
  }

  @ResolveField('host', () => IOrganization, {
    nullable: true,
    description: 'The Space host.',
  })
  async host(@Parent() space: Space): Promise<IOrganization | undefined> {
    return await this.spaceService.getHost(space.id);
  }

  @ResolveField('createdDate', () => Date, {
    nullable: true,
    description: 'The date for the creation of this Space.',
  })
  async createdDate(@Parent() space: Space): Promise<Date> {
    const createdDate = (space as Space).createdDate;
    return new Date(createdDate);
  }
}
