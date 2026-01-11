import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { LoggerService } from '@nestjs/common';
import { Inject, UseGuards } from '@nestjs/common/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthorizationActorPrivilege, CurrentActor } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { IRoom } from '@domain/communication/room/room.interface';
import { ConversationService } from './conversation.service';
import { IConversation } from './conversation.interface';
import { IUser } from '@domain/community/user/user.interface';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { CommunicationConversationType } from '@common/enums/communication.conversation.type';
import { ActorType } from '@common/enums/actor.type';
import { ActorContext } from '@core/actor-context';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';

@Resolver(() => IConversation)
export class ConversationResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly conversationService: ConversationService,
    private readonly virtualContributorLookupService: VirtualContributorLookupService,
    private readonly actorLookupService: ActorLookupService
  ) {}

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('room', () => IRoom, {
    nullable: true,
    description: 'The room for this Conversation.',
  })
  async room(
    @Parent() conversation: IConversation
  ): Promise<IRoom | undefined> {
    return await this.conversationService.getRoom(conversation.id);
  }

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('type', () => CommunicationConversationType, {
    nullable: false,
    description:
      'The type of this Conversation (USER_USER or USER_VC), inferred from member actor types.',
  })
  async type(
    @Parent() conversation: IConversation
  ): Promise<CommunicationConversationType> {
    return await this.conversationService.inferConversationType(
      conversation.id
    );
  }

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('user', () => IUser, {
    nullable: true,
    description:
      'The other user participating in this Conversation (excludes the current user).',
  })
  async user(
    @Parent() conversation: IConversation,
    @CurrentActor() actorContext: ActorContext
  ): Promise<IUser | null> {
    return await this.conversationService.getUserFromConversation(
      conversation.id,
      actorContext.actorId
    );
  }

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('virtualContributor', () => IVirtualContributor, {
    nullable: true,
    description:
      'The virtual contributor participating in this Conversation (only for USER_VC conversations).',
  })
  async virtualContributor(
    @Parent() conversation: IConversation
  ): Promise<IVirtualContributor | null> {
    const memberships = await this.conversationService.getConversationMembers(
      conversation.id
    );

    // Get actor types using cached lookup
    const actorIds = memberships.map(m => m.actorId);
    const typeMap =
      await this.actorLookupService.validateActorsAndGetTypes(actorIds);

    // Find the virtual contributor actor among members
    const vcActorId = actorIds.find(id => typeMap.get(id) === ActorType.VIRTUAL);

    if (!vcActorId) {
      return null;
    }

    // VirtualContributor IS an Actor - actorId = virtualContributorId
    return await this.virtualContributorLookupService.getVirtualContributorById(
      vcActorId
    );
  }
}
