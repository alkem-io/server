import { ActorGroup } from '@domain/context/actor-group/actor-group.entity';
import { Aspect } from '@domain/context/aspect/aspect.entity';
import { Relation } from '@domain/collaboration/relation/relation.entity';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Profiling } from '@src/common/decorators';
import { Opportunity } from './opportunity.entity';
import { OpportunityService } from './opportunity.service';
import { Community } from '@domain/community/community';

@Resolver(() => Opportunity)
export class OpportunityResolverFields {
  constructor(private opportunityService: OpportunityService) {}

  @Roles(AuthorizationRoles.Members)
  @UseGuards(GqlAuthGuard)
  @ResolveField('community', () => Community, {
    nullable: true,
    description: 'The community for the opportunity.',
  })
  @Profiling.api
  async community(@Parent() opportunity: Opportunity) {
    const community = await this.opportunityService.loadCommunity(
      opportunity.id
    );
    return community;
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
}
