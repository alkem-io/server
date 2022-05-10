import { CurrentUser } from '@common/decorators/current-user.decorator';
import { SubscriptionType } from '@common/enums/subscription.type';
import { AgentInfo } from '@core/authentication/agent-info';
import { GraphqlGuard } from '@core/authorization';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Resolver, Subscription } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PubSubEngine } from 'graphql-subscriptions';
import { LogContext } from '@common/enums/logging.context';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { SUBSCRIPTION_CONTEXT_ASPECT_CREATED } from '@common/constants/providers';
import { ContextService } from '@domain/context/context/context.service';
import { ContextAspectCreated } from '@domain/context/context/dto/context.dto.event.aspect.created';

@Resolver()
export class ContextResolverSubscriptions {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(SUBSCRIPTION_CONTEXT_ASPECT_CREATED)
    private subscriptionAspectCreated: PubSubEngine,
    private contextService: ContextService,
    private authorizationService: AuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Subscription(() => ContextAspectCreated, {
    description:
      'Receive new Update messages on Communities the currently authenticated User is a member of.',
    async resolve(
      this: ContextResolverSubscriptions,
      value: ContextAspectCreated,
      _: unknown,
      context: { req: { user: AgentInfo } }
    ): Promise<ContextAspectCreated> {
      const agentInfo = context.req.user;
      const logMsgPrefix = `[User (${agentInfo.email}) Context Aspects] - `;
      this.logger.verbose?.(
        `${logMsgPrefix} sending out event for Aspects on Context: ${value.contextID} `,
        LogContext.SUBSCRIPTIONS
      );
      return value;
    },
    async filter(
      this: ContextResolverSubscriptions,
      payload: ContextAspectCreated,
      variables: { contextID: string },
      context: { req: { user: AgentInfo } }
    ) {
      const agentInfo = context.req.user;
      const logMsgPrefix = `[User (${agentInfo.email}) Context Aspects] - `;
      this.logger.verbose?.(
        `${logMsgPrefix} Filtering event '${payload.eventID}'`,
        LogContext.SUBSCRIPTIONS
      );

      const isSameContext = payload.contextID === variables.contextID;
      this.logger.verbose?.(
        `${logMsgPrefix} Filter result is ${isSameContext}`,
        LogContext.SUBSCRIPTIONS
      );
      return isSameContext;
    },
  })
  async contextAspectCreated(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'contextID',
      type: () => UUID,
      description: 'The ID of the Context to subscribe to.',
      nullable: false,
    })
    contextID: string
  ) {
    const logMsgPrefix = `[User (${agentInfo.email}) Context Aspects] - `;
    this.logger.verbose?.(
      `${logMsgPrefix} Subscribing to the following Context Aspects: ${contextID}`,
      LogContext.SUBSCRIPTIONS
    );
    // check the user has the READ privilege
    const context = await this.contextService.getContextOrFail(contextID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      context.authorization,
      AuthorizationPrivilege.READ,
      `subscription to new Aspects on Context: ${context.id}`
    );

    return this.subscriptionAspectCreated.asyncIterator(
      SubscriptionType.CONTEXT_ASPECT_CREATED
    );
  }
}
