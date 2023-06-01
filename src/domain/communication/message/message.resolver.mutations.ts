import { IMessage } from './message.interface';
import { GraphqlGuard } from '@core/authorization';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CurrentUser, Profiling } from '@common/decorators';
import { AgentInfo } from '@core/authentication/agent-info';
import { SendMessageInput } from './dto/message.dto.room.send.message';
import { SendMessageReplyInput } from './dto/message.dto.room.send.message.reply';
import { AddMessageReactionInput } from './dto/message.dto.add.reaction';
import { RemoveMessageReactionInput } from './dto/message.dto.remove.reaction';
import { MessageService } from './message.service';

@Resolver()
export class MessageResolverMutations {
  constructor(private messageService: MessageService) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IMessage, {
    description: 'Sends a message to the specified Room.',
  })
  @Profiling.api
  async sendMessageToRoom(
    @Args('messageData') messageData: SendMessageInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IMessage> {
    const message = await this.messageService.sendMessageToRoom(
      agentInfo.communicationID,
      messageData.message,
      messageData
    );

    return message;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IMessage, {
    description: 'Sends a reply to a message from the specified Room.',
  })
  @Profiling.api
  async sendMessageReplyToRoom(
    @Args('messageData') messageData: SendMessageReplyInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IMessage> {
    const message = await this.messageService.sendMessageReplyToRoom(
      messageData.communicationRoomID,
      agentInfo.communicationID,
      messageData
    );

    return message;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IMessage, {
    description: 'Add a reaction to a message from the specified Room. ',
  })
  @Profiling.api
  async addReactionToMessageInRoom(
    @Args('messageData') messageData: AddMessageReactionInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IMessage> {
    const message = await this.messageService.addMessageReactionInRoom(
      messageData.communicationRoomID,
      agentInfo.communicationID,
      messageData
    );

    return message;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IMessage, {
    description: 'Remove a reaction on a message from the specified Room. ',
  })
  @Profiling.api
  async removeReactionToMessageInRoom(
    @Args('messageData') messageData: RemoveMessageReactionInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<boolean> {
    return await this.messageService.removeMessageReactionInRoom(
      messageData.communicationRoomID,
      agentInfo.communicationID,
      messageData
    );
  }
}
