import { CurrentActor } from '@common/decorators';
import { LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { IConversation } from '@domain/communication/conversation/conversation.interface';
import { MessagingService } from '@domain/communication/messaging/messaging.service';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { MeConversationsResult } from './dto/me.conversations.result';

@Resolver(() => MeConversationsResult)
export class MeConversationsResolverFields {
  constructor(private readonly messagingService: MessagingService) {}

  @ResolveField(() => [IConversation], {
    nullable: false,
    description:
      'All conversations (direct and group) for the current authenticated user. Client handles categorization by room type and member actor types.',
  })
  async conversations(
    @CurrentActor() actorContext: ActorContext,
    @Parent() _parent: MeConversationsResult
  ): Promise<IConversation[]> {
    if (!actorContext.actorID) {
      throw new ValidationException(
        'Unable to retrieve conversations as no userID provided.',
        LogContext.COMMUNICATION
      );
    }

    const platformMessaging =
      await this.messagingService.getPlatformMessaging();

    return await this.messagingService.getConversationsForActor(
      platformMessaging.id,
      actorContext.actorID
    );
  }
}
