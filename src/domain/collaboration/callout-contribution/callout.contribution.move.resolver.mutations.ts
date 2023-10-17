import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication';
import { CalloutContributionService } from './callout.contribution.service';
import { ICalloutContribution } from './callout.contribution.interface';
import { CalloutContributionMoveService } from './callout.contribution.move.service';
import { MoveCalloutContributionInput } from './dto/callout.contribution.dto.move';

@Resolver()
export class CalloutContributionMoveResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private calloutContributionService: CalloutContributionService,
    private calloutContributionMoveService: CalloutContributionMoveService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICalloutContribution, {
    description: 'Moves the specified Contribution to another Callout.',
  })
  async moveContributionToCallout(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('moveContributionData')
    moveContributionData: MoveCalloutContributionInput
  ): Promise<ICalloutContribution> {
    const contribution =
      await this.calloutContributionService.getCalloutContributionOrFail(
        moveContributionData.contributionID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      contribution.authorization,
      AuthorizationPrivilege.MOVE_CONTRIBUTION,
      `move contribution: ${contribution.id}`
    );
    return await this.calloutContributionMoveService.moveContributionToCallout(
      moveContributionData.contributionID,
      moveContributionData.calloutID
    );
  }
}
