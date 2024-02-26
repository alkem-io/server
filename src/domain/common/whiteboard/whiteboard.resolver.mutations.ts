import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Resolver, Mutation } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent-info';
import { WhiteboardCheckoutEventInput } from '../whiteboard-checkout/dto/whiteboard.checkout.dto.event';
import { IWhiteboardCheckout } from '../whiteboard-checkout/whiteboard.checkout.interface';
import { WhiteboardCheckoutLifecycleOptionsProvider } from '../whiteboard-checkout/whiteboard.checkout.lifecycle.options.provider';
import { WhiteboardCheckoutAuthorizationService } from '../whiteboard-checkout/whiteboard.checkout.service.authorization';
import { WhiteboardService } from './whiteboard.service';
import { IWhiteboard } from './whiteboard.interface';
import { UpdateWhiteboardDirectInput } from './dto/whiteboard.dto.update.direct';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { WhiteboardContentUpdated } from '@domain/common/whiteboard/dto/whiteboard.dto.event.content.updated';
import { PubSubEngine } from 'graphql-subscriptions';
import { SubscriptionType } from '@common/enums/subscription.type';
import { SUBSCRIPTION_WHITEBOARD_CONTENT } from '@common/constants/providers';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums/logging.context';
import { getRandomId } from '@src/common/utils';
import { DeleteWhiteboardInput } from './dto/whiteboard.dto.delete';
import { WhiteboardCheckoutService } from '../whiteboard-checkout/whiteboard.checkout.service';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';

@Resolver(() => IWhiteboard)
export class WhiteboardResolverMutations {
  constructor(
    private contributionReporter: ContributionReporterService,
    private authorizationService: AuthorizationService,
    private whiteboardService: WhiteboardService,
    private whiteboardCheckoutService: WhiteboardCheckoutService,
    private whiteboardCheckoutAuthorizationService: WhiteboardCheckoutAuthorizationService,
    private whiteboardCheckoutLifecycleOptionsProvider: WhiteboardCheckoutLifecycleOptionsProvider,
    private communityResolverService: CommunityResolverService,
    @Inject(SUBSCRIPTION_WHITEBOARD_CONTENT)
    private readonly subscriptionWhiteboardContent: PubSubEngine,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IWhiteboardCheckout, {
    description: 'Trigger an event on the Organization Verification.',
  })
  async eventOnWhiteboardCheckout(
    @Args('whiteboardCheckoutEventData')
    whiteboardCheckoutEventData: WhiteboardCheckoutEventInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IWhiteboardCheckout> {
    const whiteboardCheckout =
      await this.whiteboardCheckoutLifecycleOptionsProvider.eventOnWhiteboardCheckout(
        whiteboardCheckoutEventData,
        agentInfo
      );
    const whiteboard = await this.whiteboardService.getWhiteboardOrFail(
      whiteboardCheckout.whiteboardID
    );
    await this.whiteboardCheckoutAuthorizationService.applyAuthorizationPolicy(
      whiteboardCheckout,
      whiteboard.authorization
    );
    return this.whiteboardCheckoutService.getWhiteboardCheckoutOrFail(
      whiteboardCheckout.id
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IWhiteboard, {
    description: 'Updates the specified Whiteboard.',
  })
  async updateWhiteboard(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('whiteboardData') whiteboardData: UpdateWhiteboardDirectInput
  ): Promise<IWhiteboard> {
    const whiteboard = await this.whiteboardService.getWhiteboardOrFail(
      whiteboardData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      whiteboard.authorization,
      AuthorizationPrivilege.UPDATE_WHITEBOARD,
      `update Whiteboard: ${whiteboard.nameID}`
    );

    const updatedWhiteboard = await this.whiteboardService.updateWhiteboard(
      whiteboard,
      whiteboardData,
      agentInfo
    );

    const eventID = `whiteboard-${getRandomId()}`;
    const subscriptionPayload: WhiteboardContentUpdated = {
      eventID: eventID,
      whiteboardID: updatedWhiteboard.id,
      content: updatedWhiteboard.content ?? '', //todo how to handle this?
    };
    this.logger.verbose?.(
      `[Whiteboard updated] - event published: '${eventID}'`,
      LogContext.SUBSCRIPTIONS
    );
    this.subscriptionWhiteboardContent.publish(
      SubscriptionType.WHITEBOARD_CONTENT_UPDATED,
      subscriptionPayload
    );

    const { spaceID } =
      await this.communityResolverService.getCommunityFromWhiteboardOrFail(
        whiteboard.id
      );

    this.contributionReporter.calloutWhiteboardEdited(
      {
        id: whiteboard.id,
        name: whiteboard.nameID,
        space: spaceID,
      },
      {
        id: agentInfo.userID,
        email: agentInfo.email,
      }
    );

    return updatedWhiteboard;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IWhiteboard, {
    description: 'Updates the specified Whiteboard.',
  })
  async deleteWhiteboard(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('whiteboardData') whiteboardData: DeleteWhiteboardInput
  ): Promise<IWhiteboard> {
    const whiteboard = await this.whiteboardService.getWhiteboardOrFail(
      whiteboardData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      whiteboard.authorization,
      AuthorizationPrivilege.DELETE,
      `delete Whiteboard: ${whiteboard.nameID}`
    );

    return await this.whiteboardService.deleteWhiteboard(whiteboard.id);
  }
}
