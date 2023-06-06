import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UUID } from '@domain/common/scalars';
import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { AgentInfo } from '@src/core/authentication/agent-info';
import { ICanvas } from './';

import { CanvasService } from './canvas.service';

@Resolver(() => ICanvas)
export class CanvasResolverQueries {
  constructor(
    private authorizationService: AuthorizationService,
    private canvasService: CanvasService
  ) {}

  @UseGuards(GraphqlGuard)
  @Query(() => ICanvas, {
    nullable: false,
    description: 'A particular whiteboard, identified by the provided ID.',
  })
  @Profiling.api
  async canvas(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<ICanvas> {
    const canvas = await this.canvasService.getCanvasOrFail(id);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      canvas.authorization,
      AuthorizationPrivilege.READ,
      `read Canvas: ${canvas.nameID}`
    );

    return canvas;
  }
}
