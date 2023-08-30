import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Resolver, Mutation } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication/agent-info';
import { WhiteboardRtService } from './whiteboard.rt.service';
import { IWhiteboardRt } from './whiteboard.rt.interface';
import { UpdateWhiteboardRtDirectInput } from './dto/whiteboard.rt.dto.update.direct';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';

@Resolver(() => IWhiteboardRt)
export class WhiteboardRtResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private whiteboardRtService: WhiteboardRtService,
    private communityResolverService: CommunityResolverService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IWhiteboardRt, {
    description:
      'Updates the specified Whiteboard. Will be removed in the next iteration; manual save will not be allowed',
  })
  async updateWhiteboardRt(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('whiteboardData') whiteboardData: UpdateWhiteboardRtDirectInput
  ): Promise<IWhiteboardRt> {
    const whiteboard = await this.whiteboardRtService.getWhiteboardOrFail(
      whiteboardData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      whiteboard.authorization,
      AuthorizationPrivilege.UPDATE_WHITEBOARD,
      `update Whiteboard: ${whiteboard.nameID}`
    );

    return this.whiteboardRtService.updateWhiteboard(
      whiteboard,
      whiteboardData
    );
  }
}
