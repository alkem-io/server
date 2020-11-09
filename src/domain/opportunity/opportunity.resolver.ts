import { Inject, UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Float, Mutation } from '@nestjs/graphql/dist';
import { Roles } from '../../utils/decorators/roles.decorator';
import { GqlAuthGuard } from '../../utils/authentication/graphql.guard';
import {
  RestrictedGroupNames,
  UserGroup,
} from '../user-group/user-group.entity';
import { OpportunityInput } from './opportunity.dto';
import { Opportunity } from './opportunity.entity';
import { IOpportunity } from './opportunity.interface';
import { OpportunityService } from './opportunity.service';
import { Args, Query } from '@nestjs/graphql';
import { AspectInput } from '../aspect/aspect.dto';
import { IAspect } from '../aspect/aspect.interface';
import { Aspect } from '../aspect/aspect.entity';
import { ActorGroupInput } from '../actor-group/actor-group.dto';
import { IActorGroup } from '../actor-group/actor-group.interface';
import { ActorGroup } from '../actor-group/actor-group.entity';
import { Profiling } from '../../utils/logging/logging.profiling.decorator';
import { IRelation } from '../relation/relation.interface';
import { RelationInput } from '../relation/relation.dto';
import { Relation } from '../relation/relation.entity';
import { IUserGroup } from '../user-group/user-group.interface';
import { ProjectInput } from '../project/project.dto';
import { Project } from '../project/project.entity';
import { IProject } from '../project/project.interface';

@Resolver()
export class OpportunityResolver {
  constructor(
    @Inject(OpportunityService) private opportunityService: OpportunityService
  ) {}

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @Query(() => Opportunity, {
    nullable: false,
    description: 'A particular opportunitiy, identified by the ID',
  })
  @Profiling.api
  async opportunity(@Args('ID') id: number): Promise<IOpportunity> {
    const opportunity = await this.opportunityService.getOpportunityByID(id);
    if (opportunity) return opportunity;

    throw new Error(`Unable to locate opportunity with given id: ${id}`);
  }

  @Roles(RestrictedGroupNames.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Opportunity, {
    description:
      'Updates the specified Opportunity with the provided data (merge)',
  })
  @Profiling.api
  async updateOpportunity(
    @Args({ name: 'ID', type: () => Float }) opportunityID: number,
    @Args('opportunityData') opportunityData: OpportunityInput
  ): Promise<IOpportunity> {
    const Opportunity = await this.opportunityService.updateOpportunity(
      opportunityID,
      opportunityData
    );
    return Opportunity;
  }

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Project, {
    description: 'Create a new Project on the Opportunity identified by the ID',
  })
  @Profiling.api
  async createProject(
    @Args('opportunityID') opportunityId: number,
    @Args('projectData') projectData: ProjectInput
  ): Promise<IProject> {
    const project = await this.opportunityService.createProject(
      opportunityId,
      projectData
    );
    return project;
  }

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Aspect, {
    description: 'Create a new aspect on the Opportunity identified by the ID',
  })
  @Profiling.api
  async createAspect(
    @Args('opportunityID') opportunityId: number,
    @Args('aspectData') aspectData: AspectInput
  ): Promise<IAspect> {
    const aspect = await this.opportunityService.createAspect(
      opportunityId,
      aspectData
    );
    return aspect;
  }

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @Mutation(() => ActorGroup, {
    description:
      'Create a new actor group on the Opportunity identified by the ID',
  })
  @Profiling.api
  async createActorGroup(
    @Args('opportunityID') opportunityId: number,
    @Args('actorGroupData') actorGroupData: ActorGroupInput
  ): Promise<IActorGroup> {
    const actorGroup = await this.opportunityService.createActorGroup(
      opportunityId,
      actorGroupData
    );
    return actorGroup;
  }

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Relation, {
    description:
      'Create a new relation on the Opportunity identified by the ID',
  })
  @Profiling.api
  async createRelation(
    @Args('opportunityID') opportunityId: number,
    @Args('relationData') relationData: RelationInput
  ): Promise<IRelation> {
    return await this.opportunityService.createRelation(
      opportunityId,
      relationData
    );
  }

  @Mutation(() => UserGroup, {
    description:
      'Creates a new user group for the opportunity with the given id',
  })
  @Profiling.api
  async createGroupOnOpportunity(
    @Args({ name: 'opportunityID', type: () => Float }) opportunityID: number,
    @Args({ name: 'groupName', type: () => String }) groupName: string
  ): Promise<IUserGroup> {
    const group = await this.opportunityService.createGroup(
      opportunityID,
      groupName
    );
    return group;
  }

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserGroup, {
    description:
      'Adds the user with the given identifier as a member of the specified opportunity',
  })
  @Profiling.api
  async addUserToOpportunity(
    @Args('userID') userID: number,
    @Args('opportunityID') opportunityID: number
  ): Promise<IUserGroup> {
    const group = await this.opportunityService.addMember(
      userID,
      opportunityID
    );
    return group;
  }
}
