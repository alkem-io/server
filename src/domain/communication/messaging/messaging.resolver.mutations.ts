import { CurrentActor } from '@common/decorators/current-actor.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ConversationCreationType } from '@common/enums/conversation.creation.type';
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
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Mutation(() => IConversation, {
    description:
      'Create a new Conversation. Use type DIRECT for 1-on-1, GROUP for multi-party.',
  })
  async createConversation(
    @CurrentActor() actorContext: ActorContext,
    @Args('conversationData')
    conversationData: CreateConversationInput
  ): Promise<IConversation> {
    // Get the platform messaging for authorization
    const messaging = await this.messagingService.getPlatformMessaging();

    this.authorizationService.grantAccessOrFail(
      actorContext,
      messaging.authorization,
      AuthorizationPrivilege.CREATE,
      `create conversation on messaging: ${messaging.id}`
    );

    const callerAgentId = actorContext.actorID;

    // For DIRECT conversations with a user, check messaging settings
    if (conversationData.type === ConversationCreationType.DIRECT) {
      if (conversationData.memberIDs.length !== 1) {
        throw new EntityNotInitializedException(
          'DIRECT conversations require exactly 1 memberID',
          LogContext.COMMUNICATION_CONVERSATION
        );
      }
      // Check receiving user settings (only for user-to-user direct)
      await this.checkReceivingUserAccessAndSettings(
        actorContext,
        conversationData.memberIDs[0]
      );
    }

    // memberIDs are actor IDs (User extends Actor — user.id IS actor.id)
    const isGroup = conversationData.type === ConversationCreationType.GROUP;
    const internalData: CreateConversationData = {
      type: conversationData.type,
      callerAgentId,
      memberAgentIds: conversationData.memberIDs,
      displayName: isGroup ? conversationData.displayName : undefined,
      avatarUrl: isGroup ? conversationData.avatarUrl : undefined,
    };

    return await this.messagingService.createConversation(internalData);
  }

  /**
   * Check if the receiving user accepts messages.
   * Silently skips if the memberID is not a user (e.g., a VC).
   */
  private async checkReceivingUserAccessAndSettings(
    actorContext: ActorContext,
    receivingMemberID: string
  ) {
    const receivingUser = await this.userLookupService.getUserById(
      receivingMemberID,
      {
        relations: {
          settings: true,
        },
      }
    );

    // Not a user (e.g., VC) — skip settings check
    if (!receivingUser) return;

    this.authorizationService.grantAccessOrFail(
      actorContext,
      receivingUser.authorization,
      AuthorizationPrivilege.READ,
      `user ${actorContext.actorID} starting conversation with: ${receivingUser.id}`
    );

    if (!receivingUser.settings) {
      throw new EntityNotInitializedException(
        'User settings not initialized',
        LogContext.COMMUNICATION_CONVERSATION
      );
    }

    if (!receivingUser.settings.communication.allowOtherUsersToSendMessages) {
      throw new MessagingNotEnabledException(
        'User is not open to receiving messages',
        LogContext.USER,
        {
          userId: receivingUser.id,
          senderId: actorContext.actorID,
        }
      );
    }
  }
}
