import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UUID } from '@domain/common/scalars';
import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { AgentInfo } from '@src/core/authentication/agent-info';
import { IWhiteboard } from '.';

import { WhiteboardService } from './whiteboard.service';

@Resolver(() => IWhiteboard)
export class WhiteboardResolverQueries {
  constructor(
    private authorizationService: AuthorizationService,
    private whiteboardService: WhiteboardService
  ) {}

  @UseGuards(GraphqlGuard)
  @Query(() => IWhiteboard, {
    nullable: false,
    description: 'A particular whiteboard, identified by the provided ID.',
  })
  @Profiling.api
  async whiteboard(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) id: string
  ): Promise<IWhiteboard> {
    const whiteboard = await this.whiteboardService.getWhiteboardOrFail(id);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      whiteboard.authorization,
      AuthorizationPrivilege.READ,
      `read Whiteboard: ${whiteboard.nameID}`
    );

    return whiteboard;
  }
}
