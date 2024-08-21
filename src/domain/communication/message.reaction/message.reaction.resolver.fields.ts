import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { LogContext } from '@common/enums/logging.context';
import { IUser } from '@domain/community/user/user.interface';
import { EntityNotFoundException } from '@common/exceptions';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IMessageReaction } from './message.reaction.interface';
import { ContributorLookupService } from '@services/infrastructure/contributor-lookup/contributor.lookup.service';

@Resolver(() => IMessageReaction)
export class MessageReactionResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private userLookupService: ContributorLookupService
  ) {}

  @ResolveField('sender', () => IUser, {
    nullable: true,
    description: 'The user that reacted',
  })
  async sender(
    @Parent() messageReaction: IMessageReaction
  ): Promise<IUser | null> {
    const sender = messageReaction.sender;
    if (!sender) {
      return null;
    }

    try {
      return await this.userLookupService.getUserByUUID(sender);
    } catch (e: unknown) {
      if (e instanceof EntityNotFoundException) {
        this.logger?.warn(
          `sender '${sender}' unable to be resolved when resolving message '${messageReaction.id}'`,
          LogContext.COMMUNICATION
        );
        return null;
      } else {
        throw e;
      }
    }
  }
}
