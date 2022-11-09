import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AspectService } from './aspect.service';
import { IAspect } from '@domain/collaboration/aspect';
import { CurrentUser } from '@common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication';
import { MoveAspectInput } from '@domain/collaboration/aspect/dto/aspect.dto.move';
import { AspectMoveService } from './aspect.move.service';

@Resolver()
export class AspectMoveResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private aspectMoveService: AspectMoveService,
    private aspectService: AspectService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAspect, {
    description: 'Moves the specified Aspect to another Callout.',
  })
  async moveAspectToCallout(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('moveAspectData') moveAspectData: MoveAspectInput
  ): Promise<IAspect> {
    const aspect = await this.aspectService.getAspectOrFail(
      moveAspectData.aspectID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      aspect.authorization,
      AuthorizationPrivilege.MOVE_CARD,
      `move card: ${aspect.nameID}`
    );
    return await this.aspectMoveService.moveAspectToCallout(
      moveAspectData.aspectID,
      moveAspectData.calloutID
    );
  }
}
