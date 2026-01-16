import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { IMessageReaction } from './message.reaction.interface';
import { ContributorLookupService } from '@services/infrastructure/contributor-lookup/contributor.lookup.service';
import { IUser } from '@domain/community/user/user.interface';

@Resolver(() => IMessageReaction)
export class MessageReactionResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger,
    private contributorLookupService: ContributorLookupService
  ) {}

  @ResolveField('sender', () => IUser, {
    nullable: true,
    description: 'The user that reacted',
  })
  async sender(
    @Parent() messageReaction: IMessageReaction
  ): Promise<IUser | null> {
    // sender contains the agent ID (actorId from the communication adapter)
    const senderAgentId = messageReaction.sender;
    if (!senderAgentId) {
      return null;
    }

    try {
      // Look up contributor by agent ID - reactions are only from users per schema
      const sender =
        await this.contributorLookupService.getContributorByAgentId(
          senderAgentId,
          { relations: { profile: true } }
        );

      // Return as IUser (schema constraint: reactions only from users)
      return sender as IUser | null;
    } catch (e: unknown) {
      if (e instanceof EntityNotFoundException) {
        this.logger?.warn(
          {
            message:
              'Sender unable to be resolved when resolving message reaction.',
            senderAgentId,
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
