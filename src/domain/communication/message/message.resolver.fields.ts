import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IMessage } from './message.interface';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { IActor } from '@domain/actor/actor/actor.interface';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';

@Resolver(() => IMessage)
export class MessageResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger,
    private actorLookupService: ActorLookupService
  ) {}

  @ResolveField('sender', () => IActor, {
    nullable: true,
    description: 'The User or Virtual Contributor that created this Message',
  })
  async sender(@Parent() message: IMessage): Promise<IActor | null | never> {
    // sender contains the actor ID (actorId from the communication adapter)
    const senderActorId = message.sender;
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
            message: 'Sender unable to be resolved when resolving message.',
            senderActorId,
            messageId: message.id,
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
