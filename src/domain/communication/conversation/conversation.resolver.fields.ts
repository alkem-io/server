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

@Resolver(() => IConversation)
export class ConversationResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private conversationService: ConversationService
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
}
