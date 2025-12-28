import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IConversation } from '../conversation/conversation.interface';
import { ActorContext } from '@core/actor-context';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { InstrumentResolver } from '@src/apm/decorators';
import { MessagingService } from './messaging.service';
import { LogContext } from '@common/enums/logging.context';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { CreateConversationInput } from '@domain/communication/conversation/dto';
import { MessagingNotEnabledException } from '@common/exceptions/messaging.not.enabled.exception';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { ValidationException } from '@common/exceptions/validation.exception';
import { ActorLookupService } from '@domain/actor/actor-lookup';
import { ActorType } from '@common/enums/actor.type';

@InstrumentResolver()
@Resolver()
export class MessagingResolverMutations {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly messagingService: MessagingService,
    private readonly userLookupService: UserLookupService,
    private readonly actorLookupService: ActorLookupService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Mutation(() => IConversation, {
    description: 'Create a new Conversation on the Messaging.',
  })
  async createConversation(
    @CurrentUser() actorContext: ActorContext,
    @Args('conversationData')
    conversationData: CreateConversationInput
  ): Promise<IConversation> {
    // Validate input
    if (
      !conversationData.receiverActorId &&
      !conversationData.wellKnownVirtualContributor
    ) {
      throw new ValidationException(
        'Either receiverActorId or wellKnownVirtualContributor must be provided',
        LogContext.COMMUNICATION_CONVERSATION
      );
    }

    // Auth check on platform messaging
    const messaging = await this.messagingService.getPlatformMessaging();
    this.authorizationService.grantAccessOrFail(
      actorContext,
      messaging.authorization,
      AuthorizationPrivilege.CREATE,
      `create conversation on messaging: ${messaging.id}`
    );

    // For user-to-user conversations, check receiving user's settings
    if (
      conversationData.receiverActorId &&
      !conversationData.wellKnownVirtualContributor
    ) {
      const receiverType = await this.actorLookupService.getActorTypeById(
        conversationData.receiverActorId
      );
      if (receiverType === ActorType.USER) {
        await this.checkReceivingUserAccessAndSettings(
          actorContext,
          conversationData.receiverActorId
        );
      }
    }

    // Delegate to service - it handles wellKnownVC resolution and type checking
    return await this.messagingService.createConversation(
      actorContext.actorId,
      conversationData.receiverActorId,
      conversationData.wellKnownVirtualContributor
    );
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
