import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import { CommunicationService } from './communication.service';
import { CurrentUser, Profiling } from '@src/common/decorators';

import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CommunicationSendUpdateMessageInput } from './dto/communication.dto.send.update.message';
import { AuthorizationPrivilege } from '@common/enums';
import { CommunicationRemoveUpdateMessageInput } from './dto/communication.dto.remove.update.message';
import { IDiscussion } from '../discussion/discussion.interface';
import { CommunicationCreateDiscussionInput } from './dto/communication.dto.create.discussion';

@Resolver()
export class CommunicationResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private communicationService: CommunicationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => String, {
    description: 'Sends an update message on the specified communication',
  })
  @Profiling.api
  async sendUpdate(
    @Args('messageData') messageData: CommunicationSendUpdateMessageInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<string> {
    const communication =
      await this.communicationService.getCommunicationOrFail(
        messageData.communicationID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      communication.authorization,
      AuthorizationPrivilege.UPDATE,
      `communication send message: ${communication.displayName}`
    );
    return await this.communicationService.sendMessageToCommunicationUpdates(
      communication,
      agentInfo.communicationID,
      messageData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => String, {
    description: 'Removes an update message from the specified communication',
  })
  @Profiling.api
  async removeUpdate(
    @Args('messageData') messageData: CommunicationRemoveUpdateMessageInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<string> {
    const communication =
      await this.communicationService.getCommunicationOrFail(
        messageData.communicationID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      communication.authorization,
      AuthorizationPrivilege.UPDATE,
      `communication send message: ${communication.displayName}`
    );
    await this.communicationService.removeMessageFromCommunicationUpdates(
      communication,
      agentInfo.communicationID,
      messageData
    );

    return messageData.messageId;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IDiscussion, {
    description: 'Creates a new Discussion as part of this Communication.',
  })
  async createDiscussion(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('createData') createData: CommunicationCreateDiscussionInput
  ): Promise<IDiscussion> {
    const discussion = await this.communicationService.getCommunicationOrFail(
      createData.communicationID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      discussion.authorization,
      AuthorizationPrivilege.CREATE,
      `delete reference: ${discussion.id}`
    );
    return await this.communicationService.createDiscussion(createData);
  }
}
