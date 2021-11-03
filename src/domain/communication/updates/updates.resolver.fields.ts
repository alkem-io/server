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
import { CommunicationMessageResult } from '../message/communication.dto.message.result';
import { IUpdates } from './updates.interface';
import { UpdatesService } from './updates.service';

@Resolver(() => IUpdates)
export class UpdatesResolverFields {
  constructor(private updatesService: UpdatesService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('messages', () => [CommunicationMessageResult], {
    nullable: true,
    description: 'Messages in this Updates.',
  })
  @Profiling.api
  async messages(
    @Parent() updates: IUpdates,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<CommunicationMessageResult[]> {
    const discussionRoom = await this.updatesService.getUpdatesRoom(
      updates,
      agentInfo.communicationID
    );
    return discussionRoom.messages;
  }
}
