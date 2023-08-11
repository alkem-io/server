import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { Space } from '@domain/challenge/space/space.entity';
import { IProject } from '@domain/collaboration/project';
import { INVP } from '@domain/common/nvp';
import { UUID, UUID_NAMEID } from '@domain/common/scalars';
import { IOrganization } from '@domain/community/organization';
import { ICommunity } from '@domain/community/community';
import { IUserGroup } from '@domain/community/user-group';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { IContext } from '@domain/context/context';
import { UseGuards } from '@nestjs/common';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { SpaceService } from '@domain/challenge/space/space.service';
import { ISpace } from '@domain/challenge/space/space.interface';
import { IOpportunity } from '@domain/collaboration/opportunity';
import { IAgent } from '@domain/agent/agent';
import { IPreference } from '@domain/common/preference/preference.interface';
import { ITemplatesSet } from '@domain/template/templates-set';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { LimitAndShuffleIdsQueryArgs } from '@domain/common/query-args/limit-and-shuffle.ids.query.args';
import { IProfile } from '@domain/common/profile';
import { Loader } from '@core/dataloader/decorators';
import {
  SpaceTemplatesSetLoaderCreator,
  JourneyCollaborationLoaderCreator,
  JourneyCommunityLoaderCreator,
  JourneyContextLoaderCreator,
  PreferencesLoaderCreator,
  AgentLoaderCreator,
  ProfileLoaderCreator,
} from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { SpaceStorageBucketLoaderCreator } from '@core/dataloader/creators/loader.creators/space/space.storage.space.loader.creator';

@Resolver(() => ISpace)
export class SpaceResolverFields {
  constructor(
    private groupService: UserGroupService,
    private spaceService: SpaceService
  ) {}

  @ResolveField('community', () => ICommunity, {
    nullable: true,
    description:
      'Get a Community within the Space. Defaults to the Community for the Space itself.',
  })
  @Profiling.api
  async community(
    @Parent() space: Space,
    @Args('ID', { type: () => UUID, nullable: true }) ID: string,
    @Loader(JourneyCommunityLoaderCreator, { parentClassRef: Space })
    loader: ILoader<ICommunity>
  ) {
    // Default to returning the community for the Space
    if (!ID) {
      return loader.load(space.id);
    }
    return await this.spaceService.getCommunityInNameableScope(ID, space);
  }

  @ResolveField('context', () => IContext, {
    nullable: true,
    description: 'The context for the space.',
  })
  @Profiling.api
  async context(
    @Parent() space: Space,
    @Loader(JourneyContextLoaderCreator, { parentClassRef: Space })
    loader: ILoader<IContext>
  ) {
    return loader.load(space.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('collaboration', () => ICollaboration, {
    nullable: true,
    description: 'The collaboration for the Space.',
  })
  @Profiling.api
  async collaboration(
    @Parent() space: Space,
    @Loader(JourneyCollaborationLoaderCreator, { parentClassRef: Space })
    loader: ILoader<IContext>
  ) {
    return loader.load(space.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('agent', () => IAgent, {
    nullable: true,
    description: 'The Agent representing this Space.',
  })
  @UseGuards(GraphqlGuard)
  @Profiling.api
  async agent(
    @Parent() space: Space,
    @Loader(AgentLoaderCreator, { parentClassRef: Space })
    loader: ILoader<IAgent>
  ): Promise<IAgent> {
    return loader.load(space.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('templates', () => ITemplatesSet, {
    nullable: true,
    description: 'The templates in use by this Space',
  })
  @UseGuards(GraphqlGuard)
  async templatesSet(
    @Parent() space: Space,
    @Loader(SpaceTemplatesSetLoaderCreator) loader: ILoader<ITemplatesSet>
  ): Promise<ITemplatesSet> {
    return loader.load(space.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('storageBucket', () => IStorageBucket, {
    nullable: true,
    description: 'The StorageBucket with documents in use by this Space',
  })
  @UseGuards(GraphqlGuard)
  async storageBucket(
    @Parent() space: Space,
    @Loader(SpaceStorageBucketLoaderCreator) loader: ILoader<IStorageBucket>
  ): Promise<IStorageBucket> {
    return loader.load(space.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('preferences', () => [IPreference], {
    nullable: true,
    description: 'The preferences for this Space',
  })
  @UseGuards(GraphqlGuard)
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
  @ResolveField('challenges', () => [IChallenge], {
    nullable: true,
    description: 'The challenges for the space.',
  })
  @UseGuards(GraphqlGuard)
  @Profiling.api
  async challenges(
    @Parent() space: Space,
    @Args({ nullable: true }) args: LimitAndShuffleIdsQueryArgs
  ) {
    return await this.spaceService.getChallenges(space, args);
  }

  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for the Space.',
  })
  @Profiling.api
  async profile(
    @Parent() space: Space,
    @Loader(ProfileLoaderCreator, { parentClassRef: Space })
    loader: ILoader<IProfile>
  ) {
    return loader.load(space.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('challenge', () => IChallenge, {
    nullable: false,
    description: 'A particular Challenge, either by its ID or nameID',
  })
  @UseGuards(GraphqlGuard)
  @Profiling.api
  async challenge(
    @Args('ID', { type: () => UUID_NAMEID }) id: string,
    @Parent() space: Space
  ): Promise<IChallenge> {
    return await this.spaceService.getChallengeInNameableScope(id, space);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('opportunities', () => [IOpportunity], {
    nullable: true,
    description: 'All opportunities within the space',
  })
  @UseGuards(GraphqlGuard)
  @Profiling.api
  async opportunities(
    @Parent() space: Space,
    @Args('IDs', {
      type: () => [UUID],
      nullable: true,
    })
    IDs: string[]
  ): Promise<IOpportunity[]> {
    return await this.spaceService.getOpportunitiesInNameableScope(space, IDs);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('opportunity', () => IOpportunity, {
    nullable: false,
    description: 'A particular Opportunity, either by its ID or nameID',
  })
  @UseGuards(GraphqlGuard)
  @Profiling.api
  async opportunity(
    @Args('ID', { type: () => UUID_NAMEID }) id: string,
    @Parent() space: Space
  ): Promise<IOpportunity> {
    return await this.spaceService.getOpportunityInNameableScope(id, space);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('projects', () => [IProject], {
    nullable: false,
    description: 'All projects within this space',
  })
  @UseGuards(GraphqlGuard)
  @Profiling.api
  async projects(@Parent() space: Space): Promise<IProject[]> {
    return await this.spaceService.getProjects(space);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('project', () => IProject, {
    nullable: false,
    description: 'A particular Project, identified by the ID',
  })
  @UseGuards(GraphqlGuard)
  @Profiling.api
  async project(
    @Parent() space: Space,
    @Args('ID', { type: () => UUID_NAMEID }) projectID: string
  ): Promise<IProject> {
    return await this.spaceService.getProjectInNameableScope(projectID, space);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('groups', () => [IUserGroup], {
    nullable: false,
    description: 'The User Groups on this Space',
  })
  @Profiling.api
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
  @Profiling.api
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
  @Profiling.api
  async metrics(@Parent() space: Space) {
    return await this.spaceService.getMetrics(space);
  }

  @ResolveField('host', () => IOrganization, {
    nullable: true,
    description: 'The Space host.',
  })
  @Profiling.api
  async host(@Parent() space: Space): Promise<IOrganization | undefined> {
    return await this.spaceService.getHost(space.id);
  }
}
