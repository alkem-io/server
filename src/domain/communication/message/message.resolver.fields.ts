import { CurrentActor } from '@common/decorators';
import { LogContext } from '@common/enums/logging.context';
import { ActorContext } from '@core/actor-context/actor.context';
import { ContributorByAgentIdLoaderCreator } from '@core/dataloader/creators/loader.creators';
import { Loader } from '@core/dataloader/decorators/data.loader.decorator';
import { ILoader } from '@core/dataloader/loader.interface';
import { IActor } from '@domain/actor/actor/actor.interface';
import { Inject } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { IMessageAttachment } from '../message-attachment/message.attachment.interface';
import { MessageAttachmentService } from '../message-attachment/message.attachment.service';
import { IMessage } from './message.interface';

@Resolver(() => IMessage)
export class MessageResolverFields {
  constructor(
    private readonly messageAttachmentService: MessageAttachmentService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger
  ) {}

  @ResolveField('sender', () => IActor, {
    nullable: true,
    description: 'The User or Virtual Contributor that created this Message',
  })
  async sender(
    @Parent() message: IMessage,
    @Loader(ContributorByAgentIdLoaderCreator, { resolveToNull: true })
    loader: ILoader<IActor | null>
  ): Promise<IActor | null> {
    // sender contains the agent ID (actorID from the communication adapter)
    const senderActorID = message.sender;
    if (!senderActorID) {
      return null;
    }

    const sender = await loader.load(message.sender);

    if (!sender) {
      this.logger?.warn(
        {
          message: 'Sender unable to be resolved when resolving message.',
          senderActorID,
          messageId: message.id,
        },
        LogContext.COMMUNICATION
      );
    }

    return sender;
  }

  @ResolveField('attachments', () => [IMessageAttachment], {
    nullable: false,
    description:
      'The media attachments on this Message (feature 013). READ-gated; empty when the feature is disabled or the viewer cannot read the documents.',
  })
  async attachments(
    @Parent() message: IMessage,
    @CurrentActor() actorContext: ActorContext
  ): Promise<IMessageAttachment[]> {
    return this.messageAttachmentService.resolveMessageAttachments(
      message,
      actorContext
    );
  }
}
