import { CurrentActor } from '@common/decorators';
import { ActorContext } from '@core/actor-context/actor.context';
import { IConversation } from '@domain/communication/conversation/conversation.interface';
import { MessagingService } from '@domain/communication/messaging/messaging.service';
import { Inject, LoggerService } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { LogContext } from '@src/common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MeConversationsResult } from './dto/me.conversations.result';

@Resolver(() => MeConversationsResult)
export class MeConversationsResolverFields {
  constructor(
    private readonly messagingService: MessagingService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

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
      this.logger.verbose?.(
        'Degrading me.conversations.conversations to its empty value: request has no resolved actor',
        LogContext.AUTH
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
