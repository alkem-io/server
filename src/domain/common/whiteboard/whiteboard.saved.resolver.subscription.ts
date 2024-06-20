import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Resolver } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { GraphqlGuard } from '@core/authorization';
import { LogContext } from '@common/enums/logging.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { TypedSubscription } from '@src/common/decorators';
import {
  WhiteboardSavedSubscriptionArgs,
  WhiteboardSavedSubscriptionResult,
} from '@domain/common/whiteboard/dto/subscription/';
import { SubscriptionReadService } from '@services/subscriptions/subscription-service';
import { WhiteboardSavedSubscriptionPayload } from '@services/subscriptions/subscription-service/dto';
import { WhiteboardService } from './whiteboard.service';

@Resolver()
export class WhiteboardSavedResolverSubscription {
  constructor(
    private authorizationService: AuthorizationService,
    private whiteboardService: WhiteboardService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private subscriptionService: SubscriptionReadService
  ) {}

  @UseGuards(GraphqlGuard)
  @TypedSubscription<
    WhiteboardSavedSubscriptionPayload,
    WhiteboardSavedSubscriptionArgs
  >(() => WhiteboardSavedSubscriptionResult, {
    description: 'Receive Whiteboard Saved event',
    async resolve(
      this: WhiteboardSavedResolverSubscription,
      payload,
      args,
      context
    ) {
      const agentInfo = context.req?.user;
      const logMsgPrefix = `[Whhiteboard Saved (${agentInfo.email})] - `;
      this.logger.verbose?.(
        `${logMsgPrefix} Sending out event: ${payload.whiteboardID} `,
        LogContext.SUBSCRIPTIONS
      );
      return payload;
    },
    async filter(
      this: WhiteboardSavedResolverSubscription,
      payload,
      variables,
      context
    ) {
      const agentInfo = context.req?.user;
      const isMatch = variables.whiteboardID === payload.whiteboardID;
      this.logger.verbose?.(
        `[User (${agentInfo.email}) Whiteboard Saved] - Filtering whiteboard id '${payload.whiteboardID}' - match=${isMatch}`,
        LogContext.SUBSCRIPTIONS
      );
      
      // Something is changing the Date from the payload into a string. GraphQL needs it to be a Date or a serialization error occurs
      // So we do this conversion here
      payload.updatedDate = new Date(payload.updatedDate);
      return isMatch;
    },
  })
  async whiteboardSaved(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ nullable: false }) { whiteboardID }: WhiteboardSavedSubscriptionArgs
  ) {
    const logMsgPrefix = `[User (${agentInfo.email}) Saved Whiteboard] - `;
    this.logger.verbose?.(
      `${logMsgPrefix} Subscribing to the following whiteboard: ${whiteboardID} for saved events`,
      LogContext.SUBSCRIPTIONS
    );

    const whiteboard = await this.whiteboardService.getWhiteboardOrFail(
      whiteboardID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      whiteboard.authorization,
      AuthorizationPrivilege.READ,
      `subscription to Whiteboard save events on: ${whiteboard.id}`
    );

    return this.subscriptionService.subscribeToWhiteboardSavedEvents();
  }
}
