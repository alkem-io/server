import { CurrentActor } from '@common/decorators';
import { LogContext } from '@common/enums';
import { CommunicationConversationType } from '@common/enums/communication.conversation.type';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';
import { ValidationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { IConversation } from '@domain/communication/conversation/conversation.interface';
import { MessagingService } from '@domain/communication/messaging/messaging.service';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { MeConversationsResult } from './dto/me.conversations.result';

@Resolver(() => MeConversationsResult)
export class MeConversationsResolverFields {
  constructor(private readonly messagingService: MessagingService) {}

  @ResolveField(() => [IConversation], {
    nullable: false,
    description:
      'Conversations between users for the current authenticated user.',
  })
  async users(
    @CurrentActor() actorContext: ActorContext,
    @Parent() _parent: MeConversationsResult
  ): Promise<IConversation[]> {
    if (!actorContext.actorId) {
      throw new ValidationException(
        'Unable to retrieve conversations as no userID provided.',
        LogContext.COMMUNICATION
      );
    }

    return await this.messagingService.getConversationsForUser(
      actorContext.actorId,
      CommunicationConversationType.USER_USER
    );
  }

  @ResolveField(() => [IConversation], {
    nullable: false,
    description:
      'Conversations between users and virtual contributors for the current authenticated user.',
  })
  async virtualContributors(
    @CurrentActor() actorContext: ActorContext,
    @Parent() _parent: MeConversationsResult
  ): Promise<IConversation[]> {
    if (!actorContext.actorId) {
      throw new ValidationException(
        'Unable to retrieve conversations as no userID provided.',
        LogContext.COMMUNICATION
      );
    }

    return await this.messagingService.getConversationsForUser(
      actorContext.actorId,
      CommunicationConversationType.USER_VC
    );
  }

  @ResolveField(() => IConversation, {
    nullable: true,
    description:
      'Get a conversation with a well-known virtual contributor for the current user.',
  })
  async virtualContributor(
    @CurrentActor() actorContext: ActorContext,
    @Parent() _parent: MeConversationsResult,
    @Args('wellKnown', { type: () => VirtualContributorWellKnown })
    wellKnown: VirtualContributorWellKnown
  ): Promise<IConversation | null> {
    if (!actorContext.actorId) {
      throw new ValidationException(
        'Unable to retrieve conversation as no userID provided.',
        LogContext.COMMUNICATION
      );
    }

    return await this.messagingService.getConversationWithWellKnownVC(
      actorContext.actorId,
      wellKnown
    );
  }
}
