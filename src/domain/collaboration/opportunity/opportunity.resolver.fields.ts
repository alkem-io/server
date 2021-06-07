import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';
import { IOpportunity, Opportunity } from '@domain/collaboration/opportunity';
import { OpportunityService } from './opportunity.service';
import { IRelation } from '@domain/collaboration';
import { ILifecycle } from '@domain/common/lifecycle';
import { IContext } from '@domain/context/context';
import { ICommunity } from '@domain/community/community/community.interface';
import { INVP } from '@domain/common/nvp/nvp.interface';
import { AuthorizationPrivilege } from '@common/enums';

@Resolver(() => IOpportunity)
export class OpportunityResolverFields {
  constructor(private opportunityService: OpportunityService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('relations', () => [IRelation], {
    nullable: true,
    description: 'The set of Relations within the context of this Opportunity.',
  })
  @Profiling.api
  async relations(@Parent() opportunity: Opportunity) {
    return await this.opportunityService.getRelations(opportunity);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('lifecycle', () => ILifecycle, {
    nullable: true,
    description: 'The lifeycle for the Opportunity.',
  })
  @Profiling.api
  async lifecycle(@Parent() opportunity: Opportunity) {
    return await this.opportunityService.getLifecycle(opportunity.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('community', () => ICommunity, {
    nullable: true,
    description: 'The community for the Opportunity.',
  })
  @Profiling.api
  async community(@Parent() opportunity: Opportunity) {
    return await this.opportunityService.getCommunity(opportunity.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('context', () => IContext, {
    nullable: true,
    description: 'The context for the Opportunity.',
  })
  @Profiling.api
  async context(@Parent() opportunity: Opportunity) {
    return await this.opportunityService.getContext(opportunity.id);
  }

  @ResolveField('activity', () => [INVP], {
    nullable: true,
    description: 'The activity within this Opportunity.',
  })
  @Profiling.api
  async activity(@Parent() opportunity: Opportunity) {
    return await this.opportunityService.getActivity(opportunity);
  }
}
