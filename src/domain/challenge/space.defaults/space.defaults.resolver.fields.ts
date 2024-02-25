import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IInnovationFlowState } from '../innovation-flow-states/innovation.flow.state.interface';
import { ISpaceDefaults } from './space.defaults.interface';
import { SpaceDefaultsService } from './space.defaults.service';

@Resolver(() => ISpaceDefaults)
export class SpaceDefaultsResolverFields {
  constructor(private spaceDefaultsService: SpaceDefaultsService) {}

  @UseGuards(GraphqlGuard)
  @ResolveField('challengeFlowStates', () => [IInnovationFlowState], {
    nullable: false,
    description: 'The set of States in the default Challenge Flow.',
  })
  challengeFlowStates(
    @Parent() defaults: ISpaceDefaults
  ): IInnovationFlowState[] {
    return this.spaceDefaultsService.getDefaultChallengeFlowStates(defaults);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('opportunityFlowStates', () => [IInnovationFlowState], {
    nullable: false,
    description: 'The set of States in the default Opportunity Flow.',
  })
  opportunityFlowStates(
    @Parent() defaults: ISpaceDefaults
  ): IInnovationFlowState[] {
    return this.spaceDefaultsService.getDefaultOpportunityFlowStates(defaults);
  }
}
