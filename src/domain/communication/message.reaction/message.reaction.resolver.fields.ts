import { ContributorByAgentIdLoaderCreator } from '@core/dataloader/creators/loader.creators';
import { Loader } from '@core/dataloader/decorators/data.loader.decorator';
import { ILoader } from '@core/dataloader/loader.interface';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { IUser } from '@domain/community/user/user.interface';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IMessageReaction } from './message.reaction.interface';

@Resolver(() => IMessageReaction)
export class MessageReactionResolverFields {
  @ResolveField('sender', () => IUser, {
    nullable: true,
    description: 'The user that reacted',
  })
  async sender(
    @Parent() messageReaction: IMessageReaction,
    @Loader(ContributorByAgentIdLoaderCreator, { resolveToNull: true })
    loader: ILoader<IContributor | null>
  ): Promise<IUser | null> {
    // sender contains the agent ID (actorId from the communication adapter)
    if (!messageReaction.sender) {
      return null;
    }
    // Return as IUser (schema constraint: reactions only from users)
    return loader.load(messageReaction.sender) as Promise<IUser | null>;
  }
}
