import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthorizationAgentPrivilege,
  CurrentUser,
  Profiling,
} from '@src/common/decorators';
import { CommunicationService } from './communication.service';
import { AuthorizationPrivilege } from '@common/enums';
import { AgentInfo } from '@core/authentication/agent-info';
import { ICommunication } from './communication.interface';
import { IDiscussion } from '../discussion/discussion.interface';
import { CommunicationMessageResult } from '../message/communication.dto.message.result';

@Resolver(() => ICommunication)
export class CommunicationResolverFields {
  constructor(private communicationService: CommunicationService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('updates', () => [CommunicationMessageResult], {
    nullable: true,
    description: 'Update messages for this communication.',
  })
  @Profiling.api
  async updates(
    @Parent() communication: ICommunication,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<CommunicationMessageResult[]> {
    const updatesRoom =
      await this.communicationService.getUpdatesCommunicationsRoom(
        communication,
        agentInfo.communicationID
      );
    return updatesRoom.messages;
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('discussions', () => [IDiscussion], {
    nullable: true,
    description: 'The Discussions active in this Communication.',
  })
  @Profiling.api
  async discussions(
    @Parent() communication: ICommunication
  ): Promise<IDiscussion[]> {
    return await this.communicationService.getDiscussions(communication);
  }
}
