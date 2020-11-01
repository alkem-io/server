import { Inject, UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Float, Mutation } from '@nestjs/graphql/dist';
import { Roles } from '../../utils/decorators/roles.decorator';
import { GqlAuthGuard } from '../../utils/authentication/graphql.guard';
import { RestrictedGroupNames } from '../user-group/user-group.entity';
import { OpportunityInput } from './opportunity.dto';
import { Opportunity } from './opportunity.entity';
import { IOpportunity } from './opportunity.interface';
import { OpportunityService } from './opportunity.service';
import { Args, Query } from '@nestjs/graphql';
import { AspectInput } from '../aspect/aspect.dto';
import { IAspect } from '../aspect/aspect.interface';
import { Aspect } from '../aspect/aspect.entity';

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
  @Mutation(() => Aspect, {
    description: 'Create a new aspect on the Opportunity identified by the ID',
  })
  async createAspect(
    @Args('opportunityID') opportunityId: number,
    @Args('aspectData') aspectData: AspectInput
  ): Promise<IAspect> {
    const opportunity = await this.opportunityService.createAspect(
      opportunityId,
      aspectData
    );
    return opportunity;
  }
}
