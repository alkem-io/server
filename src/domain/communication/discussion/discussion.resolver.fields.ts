import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthorizationAgentPrivilege,
  CurrentUser,
  Profiling,
} from '@src/common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { AgentInfo } from '@core/authentication/agent-info';
import { DiscussionService } from './discussion.service';
import { IDiscussion } from './discussion.interface';
import { CommunicationMessageResult } from '../message/communication.dto.message.result';

@Resolver(() => IDiscussion)
export class DiscussionResolverFields {
  constructor(private discussionService: DiscussionService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('messages', () => [CommunicationMessageResult], {
    nullable: true,
    description: 'Messages for this Discussion.',
  })
  @Profiling.api
  async messages(
    @Parent() discussion: IDiscussion,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<CommunicationMessageResult[]> {
    const discussionRoom = await this.discussionService.getDiscussionRoom(
      discussion,
      agentInfo.communicationID
    );
    return discussionRoom.messages;
  }
}
