import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { IMessageReaction } from './message.reaction.interface';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { IActor } from '@domain/actor/actor/actor.interface';

@Resolver(() => IMessageReaction)
export class MessageReactionResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger,
    private actorLookupService: ActorLookupService
  ) {}

  @ResolveField('sender', () => IActor, {
    nullable: true,
    description: 'The Contributor that reacted',
  })
  async sender(
    @Parent() messageReaction: IMessageReaction
  ): Promise<IActor | null> {
    const senderActorId = messageReaction.sender;
    if (!senderActorId) {
      return null;
    }

    try {
      const sender = await this.actorLookupService.getActorById(senderActorId);

      return sender;
    } catch (e: unknown) {
      if (e instanceof EntityNotFoundException) {
        this.logger?.warn(
          {
            message:
              'Sender unable to be resolved when resolving message reaction.',
            senderActorId,
            messageReactionId: messageReaction.id,
          },
          LogContext.COMMUNICATION
        );
        return null;
      } else {
        throw e;
      }
    }
  }
}
