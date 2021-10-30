import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { DiscussionService } from './discussion.service';
import { DiscussionSendMessageInput } from './dto/discussion.dto.send.message';
import { DiscussionRemoveMessageInput } from './dto/discussion.dto.remove.message';
import { IDiscussion } from './discussion.interface';
import { DeleteDiscussionInput } from './dto/discussion.dto.delete';
import { UpdateDiscussionInput } from './dto/discussion.dto.update';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { DiscussionAuthorizationService } from './discussion.service.authorization';

@Resolver()
export class DiscussionResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private discussionService: DiscussionService,
    private discussionAuthorizationService: DiscussionAuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IDiscussion, {
    description: 'Sends a message to the specified Discussion',
  })
  @Profiling.api
  async sendMessageToDiscussion(
    @Args('messageData') messageData: DiscussionSendMessageInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IDiscussion> {
    const discussion = await this.discussionService.getDiscussionOrFail(
      messageData.discussionID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      discussion.authorization,
      AuthorizationPrivilege.CREATE,
      `discussion send message: ${discussion.title}`
    );
    await this.discussionService.sendMessageToDiscussion(
      discussion,
      agentInfo.communicationID,
      messageData
    );
    return discussion;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IDiscussion, {
    description: 'Removes a message from the specified Discussion.',
  })
  @Profiling.api
  async removeMessageFromDiscussion(
    @Args('messageData') messageData: DiscussionRemoveMessageInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IDiscussion> {
    const discussion = await this.discussionService.getDiscussionOrFail(
      messageData.discussionID
    );
    // The choice was made **not** to wrap every message in an AuthorizationPolicy.
    // So we also allow users who sent the message in question to remove the message by
    // extending the authorization policy in memory but do not persist it.
    const extendedAuthorization =
      await this.discussionAuthorizationService.extendAuthorizationPolicyForMessageSender(
        discussion,
        messageData.messageID,
        agentInfo.communicationID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      extendedAuthorization,
      AuthorizationPrivilege.DELETE,
      `communication delete message: ${discussion.title}`
    );
    await this.discussionService.removeMessageFromDiscussion(
      discussion,
      agentInfo.communicationID,
      messageData
    );

    return discussion;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IDiscussion, {
    description: 'Deletes the specified Discussion.',
  })
  async deleteDiscussion(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteDiscussionInput
  ): Promise<IDiscussion> {
    const discussion = await this.discussionService.getDiscussionOrFail(
      deleteData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      discussion.authorization,
      AuthorizationPrivilege.DELETE,
      `delete discussion: ${discussion.id}`
    );
    return await this.discussionService.deleteDiscussion(deleteData.ID);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IDiscussion, {
    description: 'Updates the specified Discussion.',
  })
  async updateDiscussion(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('updateData') updateData: UpdateDiscussionInput
  ): Promise<IDiscussion> {
    const discussion = await this.discussionService.getDiscussionOrFail(
      updateData.ID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      discussion.authorization,
      AuthorizationPrivilege.UPDATE,
      `Update discussion: ${discussion.id}`
    );
    return await this.discussionService.updateDiscussion(
      discussion,
      updateData
    );
  }
}
