import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Resolver, Mutation } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication/agent-info';
import { WhiteboardService } from './whiteboard.service';
import { IWhiteboard } from './whiteboard.interface';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UpdateWhiteboardContentInput, UpdateWhiteboardInput } from './types';
import { DeleteWhiteboardInput } from './dto/whiteboard.dto.delete';

@Resolver(() => IWhiteboard)
export class WhiteboardResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private whiteboardService: WhiteboardService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IWhiteboard, {
    description: 'Updates the specified Whiteboard.',
  })
  async updateWhiteboard(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('whiteboardData') whiteboardData: UpdateWhiteboardInput
  ): Promise<IWhiteboard> {
    const whiteboard = await this.whiteboardService.getWhiteboardOrFail(
      whiteboardData.ID
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      whiteboard.authorization,
      AuthorizationPrivilege.UPDATE,
      `update Whiteboard: ${whiteboard.nameID}`
    );

    return this.whiteboardService.updateWhiteboard(whiteboard, whiteboardData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IWhiteboard, {
    description: 'Updates the specified Whiteboard content.',
  })
  // todo rename
  async updateWhiteboardContentRt(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('whiteboardData') whiteboardData: UpdateWhiteboardContentInput
  ): Promise<IWhiteboard> {
    const whiteboard = await this.whiteboardService.getWhiteboardOrFail(
      whiteboardData.ID
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      whiteboard.authorization,
      AuthorizationPrivilege.UPDATE_CONTENT,
      `update Whiteboard: ${whiteboard.nameID}`
    );
    return this.whiteboardService.updateWhiteboardContent(
      whiteboard,
      whiteboardData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IWhiteboard, {
    description: 'Deletes the specified Whiteboard.',
  })
  async deleteWhiteboard(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('whiteboardData') whiteboardData: DeleteWhiteboardInput
  ): Promise<IWhiteboard> {
    const whiteboard = await this.whiteboardService.getWhiteboardOrFail(
      whiteboardData.ID
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      whiteboard.authorization,
      AuthorizationPrivilege.DELETE,
      `delete Whiteboard: ${whiteboard.nameID}`
    );

    return await this.whiteboardService.deleteWhiteboard(whiteboard.id);
  }
}
