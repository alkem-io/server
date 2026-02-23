import { LogContext } from '@common/enums/logging.context';
import { ContributorByAgentIdLoaderCreator } from '@core/dataloader/creators/loader.creators';
import { Loader } from '@core/dataloader/decorators/data.loader.decorator';
import { ILoader } from '@core/dataloader/loader.interface';
import { IActor } from '@domain/actor/actor/actor.interface';
import { Inject } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { IMessage } from './message.interface';

@Resolver(() => IMessage)
export class MessageResolverFields {
  constructor(
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
}
