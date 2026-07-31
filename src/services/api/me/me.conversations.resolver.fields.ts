import { CurrentActor } from '@common/decorators';
import { ActorContext } from '@core/actor-context/actor.context';
import { IConversation } from '@domain/communication/conversation/conversation.interface';
import { MessagingService } from '@domain/communication/messaging/messaging.service';
import { Logger } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { MeConversationsResult } from './dto/me.conversations.result';

@Resolver(() => MeConversationsResult)
export class MeConversationsResolverFields {
  private readonly logger = new Logger(MeConversationsResolverFields.name);

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
      this.logger.warn(
        'Degrading me.conversations.conversations to its empty value: request has no resolved actor'
      );
      return [];
    }

    const platformMessaging =
      await this.messagingService.getPlatformMessaging();

    return await this.messagingService.getConversationsForActor(
      platformMessaging.id,
      actorContext.actorID
    );
  }
}
