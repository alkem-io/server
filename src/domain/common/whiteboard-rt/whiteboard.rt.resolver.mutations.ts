import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Resolver, Mutation } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication/agent-info';
import { WhiteboardRtService } from './whiteboard.rt.service';
import { IWhiteboardRt } from './whiteboard.rt.interface';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  UpdateWhiteboardContentRtInput,
  UpdateWhiteboardRtInput,
} from './types';

@Resolver(() => IWhiteboardRt)
export class WhiteboardRtResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private whiteboardRtService: WhiteboardRtService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IWhiteboardRt, {
    description: 'Updates the specified WhiteboardRt.',
  })
  async updateWhiteboardRt(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('whiteboardData') whiteboardData: UpdateWhiteboardRtInput
  ): Promise<IWhiteboardRt> {
    const whiteboardRt = await this.whiteboardRtService.getWhiteboardRtOrFail(
      whiteboardData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      whiteboardRt.authorization,
      AuthorizationPrivilege.UPDATE,
      `update WhiteboardRt: ${whiteboardRt.nameID}`
    );

    return this.whiteboardRtService.updateWhiteboardRt(
      whiteboardRt,
      whiteboardData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IWhiteboardRt, {
    description: 'Updates the specified WhiteboardRt content.',
  })
  async updateWhiteboardContentRt(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('whiteboardData') whiteboardData: UpdateWhiteboardContentRtInput
  ): Promise<IWhiteboardRt> {
    const whiteboardRt = await this.whiteboardRtService.getWhiteboardRtOrFail(
      whiteboardData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      whiteboardRt.authorization,
      AuthorizationPrivilege.UPDATE_CONTENT,
      `update WhiteboardRt: ${whiteboardRt.nameID}`
    );

    return this.whiteboardRtService.updateWhiteboardContentRt(
      whiteboardRt,
      whiteboardData
    );
  }
}
