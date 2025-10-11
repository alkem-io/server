import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { CalloutContributionService } from './callout.contribution.service';
import { ICalloutContribution } from './callout.contribution.interface';
import { CalloutContributionMoveService } from './callout.contribution.move.service';
import { MoveCalloutContributionInput } from './dto/callout.contribution.dto.move';
import { InstrumentResolver } from '@src/apm/decorators';
import { DeleteContributionInput } from './dto/callout.contribution.dto.delete';

@InstrumentResolver()
@Resolver()
export class CalloutContributionMoveResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private calloutContributionService: CalloutContributionService,
    private calloutContributionMoveService: CalloutContributionMoveService
  ) {}

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
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      contribution.authorization,
      AuthorizationPrivilege.MOVE_CONTRIBUTION,
      `move contribution: ${contribution.id}`
    );
    return this.calloutContributionMoveService.moveContributionToCallout(
      moveContributionData.contributionID,
      moveContributionData.calloutID
    );
  }

  @Mutation(() => ICalloutContribution, {
    description: 'Deletes a contribution.',
  })
  public async deleteContribution(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteContributionInput
  ): Promise<ICalloutContribution> {
    const contribution =
      await this.calloutContributionService.getCalloutContributionOrFail(
        deleteData.ID
      );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      contribution.authorization,
      AuthorizationPrivilege.DELETE,
      `move contribution: ${contribution.id}`
    );

    return this.calloutContributionService.delete(contribution.id);
  }
}
