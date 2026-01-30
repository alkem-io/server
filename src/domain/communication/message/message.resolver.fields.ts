import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IMessage } from './message.interface';
import { LogContext } from '@common/enums/logging.context';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ContributorByAgentIdLoaderCreator } from '@core/dataloader/creators/loader.creators';
import { Loader } from '@core/dataloader/decorators/data.loader.decorator';
import { ILoader } from '@core/dataloader/loader.interface';

@Resolver(() => IMessage)
export class MessageResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger
  ) {}

  @ResolveField('sender', () => IContributor, {
    nullable: true,
    description: 'The User or Virtual Contributor that created this Message',
  })
  async sender(
    @Parent() message: IMessage,
    @Loader(ContributorByAgentIdLoaderCreator, { resolveToNull: true })
    loader: ILoader<IContributor | null>
  ): Promise<IContributor | null> {
    // sender contains the agent ID (actorId from the communication adapter)
    const senderAgentId = message.sender;
    if (!senderAgentId) {
      return null;
    }

    const sender = await loader.load(message.sender);

    if (!sender) {
      this.logger?.warn(
        {
          message: 'Sender unable to be resolved when resolving message.',
          senderAgentId,
          messageId: message.id,
        },
        LogContext.COMMUNICATION
      );
    }

    return sender;
  }
}
