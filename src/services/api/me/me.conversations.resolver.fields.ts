import { Resolver, ResolveField, Parent, Args } from '@nestjs/graphql';
import { MeConversationsResult } from './dto/me.conversations.result';
import { IConversation } from '@domain/communication/conversation/conversation.interface';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';
import { MessagingService } from '@domain/communication/messaging/messaging.service';
import { CurrentUser } from '@common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { ValidationException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { CommunicationConversationType } from '@common/enums/communication.conversation.type';

@Resolver(() => MeConversationsResult)
export class MeConversationsResolverFields {
  constructor(private readonly messagingService: MessagingService) {}

  @ResolveField(() => [IConversation], {
    nullable: false,
    description:
      'Conversations between users for the current authenticated user.',
  })
  async users(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() _parent: MeConversationsResult
  ): Promise<IConversation[]> {
    if (!agentInfo.userID) {
      throw new ValidationException(
        'Unable to retrieve conversations as no userID provided.',
        LogContext.COMMUNICATION
      );
    }

    return await this.messagingService.getConversationsForUser(
      agentInfo.userID,
      CommunicationConversationType.USER_USER
    );
  }

  @ResolveField(() => [IConversation], {
    nullable: false,
    description:
      'Conversations between users and virtual contributors for the current authenticated user.',
  })
  async virtualContributors(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() _parent: MeConversationsResult
  ): Promise<IConversation[]> {
    if (!agentInfo.userID) {
      throw new ValidationException(
        'Unable to retrieve conversations as no userID provided.',
        LogContext.COMMUNICATION
      );
    }

    return await this.messagingService.getConversationsForUser(
      agentInfo.userID,
      CommunicationConversationType.USER_VC
    );
  }

  @ResolveField(() => IConversation, {
    nullable: true,
    description:
      'Get a conversation with a well-known virtual contributor for the current user.',
  })
  async virtualContributor(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() _parent: MeConversationsResult,
    @Args('wellKnown', { type: () => VirtualContributorWellKnown })
    wellKnown: VirtualContributorWellKnown
  ): Promise<IConversation | null> {
    if (!agentInfo.userID) {
      throw new ValidationException(
        'Unable to retrieve conversation as no userID provided.',
        LogContext.COMMUNICATION
      );
    }

    return await this.messagingService.getConversationWithWellKnownVC(
      agentInfo.userID,
      wellKnown
    );
  }
}
