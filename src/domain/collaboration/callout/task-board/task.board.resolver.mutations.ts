import { CurrentActor } from '@common/decorators';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ICalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.interface';
import { CalloutContributionService } from '@domain/collaboration/callout-contribution/callout.contribution.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { MoveTaskToColumnInput } from './dto/task.board.dto.move';
import { TaskBoardMoveService } from './task.board.move.service';

@InstrumentResolver()
@Resolver()
export class TaskBoardResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private calloutContributionService: CalloutContributionService,
    private taskBoardMoveService: TaskBoardMoveService
  ) {}

  @Mutation(() => ICalloutContribution, {
    description:
      'Moves a task to another column on its Tasks board. Authorized as MOVE_TASK on the parent Callout, so a board member can move any task.',
  })
  async moveTaskToColumn(
    @CurrentActor() actorContext: ActorContext,
    @Args('moveData') moveData: MoveTaskToColumnInput
  ): Promise<ICalloutContribution> {
    // Authorize against the PARENT CALLOUT's policy, not the contribution's:
    // the board grants MOVE_TASK there to every member, which is exactly the
    // access a task move requires (and deliberately narrower than editing the
    // task's content).
    const contribution =
      await this.calloutContributionService.getCalloutContributionOrFail(
        moveData.contributionID,
        {
          relations: { callout: { authorization: true } },
        }
      );
    const callout = contribution.callout;
    if (!callout) {
      throw new ValidationException(
        'The task has no parent Callout',
        LogContext.COLLABORATION,
        { contributionID: moveData.contributionID }
      );
    }

    this.authorizationService.grantAccessOrFail(
      actorContext,
      callout.authorization,
      AuthorizationPrivilege.MOVE_TASK,
      `move task to column: ${contribution.id}`
    );

    return this.taskBoardMoveService.moveTaskToColumn(
      moveData.contributionID,
      moveData.column
    );
  }
}
