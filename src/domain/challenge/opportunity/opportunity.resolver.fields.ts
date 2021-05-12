import { ActorGroup } from '@domain/context/actor-group/actor-group.entity';
import { Aspect } from '@domain/context/aspect/aspect.entity';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { Opportunity } from './opportunity.entity';
import { OpportunityService } from './opportunity.service';
import { Community } from '@domain/community/community';
import { Lifecycle } from '@domain/common/lifecycle/lifecycle.entity';
import {
  AuthorizationGlobalRoles,
  AuthorizationRolesGlobal,
} from '@core/authorization';
import { UseGuards } from '@nestjs/common/decorators';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { Collaboration } from '@domain/collaboration/collaboration';
@Resolver(() => Opportunity)
export class OpportunityResolverFields {
  constructor(private opportunityService: OpportunityService) {}

  @ResolveField('community', () => Community, {
    nullable: true,
    description: 'The community for the opportunity.',
  })
  @Profiling.api
  async community(@Parent() opportunity: Opportunity) {
    return await this.opportunityService.getCommunity(opportunity.id);
  }

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Registered)
  @UseGuards(GraphqlGuard)
  @ResolveField('collaboration', () => Collaboration, {
    nullable: true,
    description: 'The Collaboration for the opportunity.',
  })
  @Profiling.api
  async collaboration(@Parent() opportunity: Opportunity) {
    return await this.opportunityService.getCollaboration(opportunity.id);
  }

  @ResolveField('lifecycle', () => Lifecycle, {
    nullable: true,
    description: 'The lifeycle for the Challenge.',
  })
  @Profiling.api
  async lifecycle(@Parent() opportunity: Opportunity) {
    return await this.opportunityService.getLifecycle(opportunity.id);
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
}
