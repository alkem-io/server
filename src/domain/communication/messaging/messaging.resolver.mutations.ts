import { CurrentActor } from '@common/decorators/current-actor.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CommunicationConversationType } from '@common/enums/communication.conversation.type';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { MessagingNotEnabledException } from '@common/exceptions/messaging.not.enabled.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import {
  CreateConversationData,
  CreateConversationInput,
} from '@domain/communication/conversation/dto';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { VirtualActorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IConversation } from '../conversation/conversation.interface';
import { MessagingService } from './messaging.service';

@InstrumentResolver()
@Resolver()
export class MessagingResolverMutations {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly messagingService: MessagingService,
    private readonly userLookupService: UserLookupService,
    private readonly virtualActorLookupService: VirtualActorLookupService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Mutation(() => IConversation, {
    description: 'Create a new Conversation on the Messaging.',
  })
  async createConversation(
    @CurrentActor() actorContext: ActorContext,
    @Args('conversationData')
    conversationData: CreateConversationInput
  ): Promise<IConversation> {
    // Get the platform messaging
    const messaging = await this.messagingService.getPlatformMessaging();

    this.authorizationService.grantAccessOrFail(
      actorContext,
      messaging.authorization,
      AuthorizationPrivilege.CREATE,
      `create conversation on messaging: ${messaging.id}`
    );

    // Infer conversation type from input
    const isUserVc =
      !!conversationData.virtualContributorID ||
      !!conversationData.wellKnownVirtualContributor;
    const conversationType = isUserVc
      ? CommunicationConversationType.USER_VC
      : CommunicationConversationType.USER_USER;

    // Also check if the receiving user wants to accept conversations
    if (conversationType === CommunicationConversationType.USER_USER) {
      await this.checkReceivingUserAccessAndSettings(
        actorContext,
        conversationData.userID
      );
    }

    // Resolve current user's agent ID
    const currentUser = await this.userLookupService.getUserByIdOrFail(
      actorContext.actorId
    );
    const callerAgentId = currentUser.id;

    // Build internal DTO with agent IDs
    const internalData: CreateConversationData = {
      callerAgentId,
      wellKnownVirtualContributor: conversationData.wellKnownVirtualContributor,
    };

    // Resolve invited party to agent ID
    if (conversationData.virtualContributorID) {
      const vc =
        await this.virtualActorLookupService.getVirtualContributorByIdOrFail(
          conversationData.virtualContributorID
        );
      internalData.invitedAgentId = vc.id;
    } else if (!conversationData.wellKnownVirtualContributor) {
      // User-to-user: resolve other user's agent ID
      const otherUser = await this.userLookupService.getUserByIdOrFail(
        conversationData.userID
      );
      internalData.invitedAgentId = otherUser.id;
    }

    // Authorization is now applied directly within createConversation
    return await this.messagingService.createConversation(internalData);
  }

  private async checkReceivingUserAccessAndSettings(
    actorContext: ActorContext,
    receivingUserID: string
  ) {
    const receivingUser = await this.userLookupService.getUserByIdOrFail(
      receivingUserID,
      {
        relations: {
          settings: true,
        },
      }
    );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      receivingUser.authorization,
      AuthorizationPrivilege.READ,
      `user ${actorContext.actorId} starting conversation with: ${receivingUser.id}`
    );

    if (!receivingUser.settings) {
      throw new EntityNotInitializedException(
        'User settings not initialized',
        LogContext.COMMUNICATION_CONVERSATION
      );
    }

    // Check if the user is willing to receive messages
    if (!receivingUser.settings.communication.allowOtherUsersToSendMessages) {
      throw new MessagingNotEnabledException(
        'User is not open to receiving messages',
        LogContext.USER,
        {
          userId: receivingUser.id,
          senderId: actorContext.actorId,
        }
      );
    }
  }
}
