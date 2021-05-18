import { Relation } from '@domain/collaboration/relation/relation.entity';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { IOpportunity, Opportunity } from '@domain/collaboration/opportunity';
import { OpportunityService } from './opportunity.service';

@Resolver(() => IOpportunity)
export class OpportunityResolverFields {
  constructor(private opportunityService: OpportunityService) {}

  @ResolveField('relations', () => [Relation], {
    nullable: true,
    description: 'The set of Relations within the context of this Opportunity.',
  })
  @Profiling.api
  async relations(@Parent() opportunity: Opportunity) {
    return await this.opportunityService.getRelations(opportunity);
  }
}
