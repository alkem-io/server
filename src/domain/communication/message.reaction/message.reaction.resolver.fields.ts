import { LogContext } from '@common/enums/logging.context';
import { ContributorByAgentIdLoaderCreator } from '@core/dataloader/creators/loader.creators';
import { Loader } from '@core/dataloader/decorators/data.loader.decorator';
import { ILoader } from '@core/dataloader/loader.interface';
import { IActor } from '@domain/actor/actor/actor.interface';
import { IUser } from '@domain/community/user/user.interface';
import { Inject } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { IMessageReaction } from './message.reaction.interface';

@Resolver(() => IMessageReaction)
export class MessageReactionResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger
  ) {}

  @ResolveField('sender', () => IUser, {
    nullable: true,
    description: 'The user that reacted',
  })
  async sender(
    @Parent() messageReaction: IMessageReaction,
    @Loader(ContributorByAgentIdLoaderCreator, { resolveToNull: true })
    loader: ILoader<IActor | null>
  ): Promise<IUser | null> {
    // sender contains the agent ID (actorID from the communication adapter)
    const senderActorID = messageReaction.sender;
    if (!senderActorID) {
      return null;
    }

    // Look up contributor by agent ID - reactions are only from users per schema
    const sender = await loader.load(messageReaction.sender);

    if (sender === null) {
      this.logger?.warn(
        {
          message:
            'Sender unable to be resolved when resolving message reaction.',
          senderActorID,
          messageReactionId: messageReaction.id,
        },
        LogContext.COMMUNICATION
      );
    }
    // Return as IUser (schema constraint: reactions only from users)
    return sender as IUser | null;
  }
}
