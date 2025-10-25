import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { LoggerService } from '@nestjs/common';
import { Inject, UseGuards } from '@nestjs/common/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthorizationAgentPrivilege } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { IRoom } from '@domain/communication/room/room.interface';
import { ConversationService } from './conversation.service';
import { IConversation } from './conversation.interface';
import { IUser } from '@domain/community/user/user.interface';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';

@Resolver(() => IConversation)
export class ConversationResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private conversationService: ConversationService,
    private userLookupService: UserLookupService
  ) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
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

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('users', () => [IUser], {
    nullable: false,
    description: 'The users participating in this Conversation.',
  })
  async users(@Parent() conversation: IConversation): Promise<IUser[]> {
    const users = await Promise.all(
      conversation.userIDs.map(userID =>
        this.userLookupService.getUserOrFail(userID)
      )
    );
    return users;
  }
}
