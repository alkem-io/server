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
import {
  UpdateWhiteboardContentInput,
  UpdateWhiteboardInput,
} from './types';

@Resolver(() => IWhiteboard)
export class WhiteboardResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private whiteboardService: WhiteboardService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IWhiteboard, {
    description: 'Updates the specified WhiteboardRt.',
  })
  async updateWhiteboardRt(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('whiteboardData') whiteboardData: UpdateWhiteboardInput
  ): Promise<IWhiteboard> {
    const whiteboardRt = await this.whiteboardService.getWhiteboardOrFail(
      whiteboardData.ID
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      whiteboardRt.authorization,
      AuthorizationPrivilege.UPDATE,
      `update WhiteboardRt: ${whiteboardRt.nameID}`
    );

    return this.whiteboardService.updateWhiteboard(
      whiteboardRt,
      whiteboardData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IWhiteboard, {
    description: 'Updates the specified WhiteboardRt content.',
  })
  async updateWhiteboardContentRt(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('whiteboardData') whiteboardData: UpdateWhiteboardContentInput
  ): Promise<IWhiteboard> {
    const whiteboardRt = await this.whiteboardService.getWhiteboardOrFail(
      whiteboardData.ID
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      whiteboardRt.authorization,
      AuthorizationPrivilege.UPDATE_CONTENT,
      `update WhiteboardRt: ${whiteboardRt.nameID}`
    );
    return this.whiteboardService.updateWhiteboardContent(
      whiteboardRt,
      whiteboardData
    );
  }
}
