import {
  ContributorByAgentIdLoaderCreator,
  ConversationMembershipsLoaderCreator,
} from '@core/dataloader/creators/loader.creators';
import { IConversationMembershipWithActorType } from '@core/dataloader/creators/loader.creators/conversation/conversation.memberships.loader.creator';
import { Loader } from '@core/dataloader/decorators/data.loader.decorator';
import { ILoader } from '@core/dataloader/loader.interface';
import { IActor } from '@domain/actor/actor/actor.interface';
import { IRoom } from '@domain/communication/room/room.interface';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IConversation } from './conversation.interface';
import { ConversationService } from './conversation.service';

@Resolver(() => IConversation)
export class ConversationResolverFields {
  constructor(private readonly conversationService: ConversationService) {}

  @ResolveField('room', () => IRoom, {
    nullable: true,
    description: 'The room for this Conversation.',
  })
  async room(
    @Parent() conversation: IConversation
  ): Promise<IRoom | undefined> {
    // Use eager-loaded room if available
    if (conversation.room !== undefined) {
      return conversation.room;
    }
    return await this.conversationService.getRoom(conversation.id);
  }

  @ResolveField('members', () => [IActor], {
    description:
      'All members of this Conversation, returned as actors with their types.',
  })
  async members(
    @Parent() conversation: IConversation,
    @Loader(ConversationMembershipsLoaderCreator)
    convoMembershipsLoader: ILoader<IConversationMembershipWithActorType[]>,
    @Loader(ContributorByAgentIdLoaderCreator, { resolveToNull: true })
    contributorByAgentLoader: ILoader<IActor | null>
  ): Promise<IActor[]> {
    const memberships = await convoMembershipsLoader.load(conversation.id);

    const actors: IActor[] = [];
    for (const membership of memberships) {
      const actor = await contributorByAgentLoader.load(membership.actorID);
      if (actor) {
        actors.push(actor);
      }
    }
    return actors;
  }
}
