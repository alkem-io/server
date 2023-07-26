import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Query } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { ChatGuidanceInput } from './dto/chat.guidance.dto.input';
import { ChatGuidanceService } from './chat.guidance.service';
import { IChatGuidanceQueryResult } from './dto/chat.guidance.query.result.dto';
@Resolver()
export class ChatGuidanceResolverQueries {
  constructor(private chatGuidanceService: ChatGuidanceService) {}

  @UseGuards(GraphqlGuard)
  @Query(() => IChatGuidanceQueryResult, {
    nullable: false,
    description: 'Ask the chat engine for guidance.',
  })
  async askChatGuidanceQuestion(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('chatData') chatData: ChatGuidanceInput
  ): Promise<IChatGuidanceQueryResult | undefined> {
    return this.chatGuidanceService.askQuestion(chatData.question, agentInfo);
  }
}
