import { ActorGroup } from '@domain/actor-group/actor-group.entity';
import { Application } from '@domain/application/application.entity';
import { Aspect } from '@domain/aspect/aspect.entity';
import { Relation } from '@domain/relation/relation.entity';
import { UserGroup } from '@domain/user-group/user-group.entity';
import { UserGroupService } from '@domain/user-group/user-group.service';
import { User } from '@domain/user/user.entity';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorisationRoles } from '@utils/authorisation/authorisation.roles';
import { GqlAuthGuard } from '@utils/authorisation/graphql.guard';
import { Roles } from '@utils/authorisation/roles.decorator';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@utils/error-handling/exceptions';
import { LogContext } from '@utils/logging/logging.contexts';
import { Profiling } from '@utils/logging/logging.profiling.decorator';
import { Opportunity } from './opportunity.entity';
import { OpportunityService } from './opportunity.service';

@Resolver(() => Opportunity)
export class OpportunityResolverFields {
  constructor(
    private userGroupService: UserGroupService,
    private opportunityService: OpportunityService
  ) {}

  @Roles(AuthorisationRoles.Members)
  @UseGuards(GqlAuthGuard)
  @ResolveField('groups', () => [UserGroup], {
    nullable: true,
    description: 'Groups of users related to a Opportunity.',
  })
  @Profiling.api
  async groups(@Parent() opportunity: Opportunity) {
    const groups = await this.opportunityService.loadUserGroups(opportunity);
    return groups;
  }

  @Roles(AuthorisationRoles.Members)
  @UseGuards(GqlAuthGuard)
  @ResolveField('contributors', () => [User], {
    nullable: true,
    description: 'All users that are contributing to this Opportunity.',
  })
  @Profiling.api
  async contributors(@Parent() opportunity: Opportunity) {
    const group = await this.userGroupService.getGroupByName(
      opportunity,
      AuthorisationRoles.Members
    );
    if (!group)
      throw new RelationshipNotFoundException(
        `Unable to locate members group on Opportunity: ${Opportunity.name}`,
        LogContext.COMMUNITY
      );
    const members = group.members;
    if (!members)
      throw new EntityNotInitializedException(
        `Members group not initialised on Opportunity: ${Opportunity.name}`,
        LogContext.COMMUNITY
      );
    return members;
  }

  @ResolveField('actorGroups', () => [ActorGroup], {
    nullable: true,
    description:
      'The set of actor groups within the context of this Opportunity.',
  })
  @Profiling.api
  async actorGroups(@Parent() opportunity: Opportunity) {
    return await this.opportunityService.loadActorGroups(opportunity);
  }

  @ResolveField('aspects', () => [Aspect], {
    nullable: true,
    description: 'The set of aspects within the context of this Opportunity.',
  })
  @Profiling.api
  async aspects(@Parent() opportunity: Opportunity) {
    return await this.opportunityService.loadAspects(opportunity);
  }

  @ResolveField('relations', () => [Relation], {
    nullable: true,
    description: 'The set of relations within the context of this Opportunity.',
  })
  @Profiling.api
  async relations(@Parent() opportunity: Opportunity) {
    return await this.opportunityService.loadRelations(opportunity);
  }

  @Roles(
    AuthorisationRoles.GlobalAdmins,
    AuthorisationRoles.EcoverseAdmins,
    AuthorisationRoles.CommunityAdmins
  )
  @UseGuards(GqlAuthGuard)
  @ResolveField('applications', () => [Application], {
    nullable: false,
    description: 'Application available for this opportunity.',
  })
  @Profiling.api
  async applications(@Parent() opportunity: Opportunity) {
    return await this.opportunityService.getApplications(opportunity);
  }
}
