import { Inject, UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import { CommunicationService } from './communication.service';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums';
import { IDiscussion } from '../discussion/discussion.interface';
import { CommunicationCreateDiscussionInput } from './dto/communication.dto.create.discussion';
import { DiscussionService } from '../discussion/discussion.service';
import { DiscussionAuthorizationService } from '../discussion/discussion.service.authorization';
import { NotificationsPayloadBuilder } from '@domain/common/notifications';
import { NOTIFICATIONS_SERVICE } from '@core/microservices/microservices.module';
import { ClientProxy } from '@nestjs/microservices';
import { EventType } from '@common/enums/event.type';

@Resolver()
export class CommunicationResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private communicationService: CommunicationService,
    private discussionAuthorizationService: DiscussionAuthorizationService,
    private discussionService: DiscussionService,
    private notificationsPayloadBuilder: NotificationsPayloadBuilder,
    @Inject(NOTIFICATIONS_SERVICE) private notificationsClient: ClientProxy
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IDiscussion, {
    description: 'Creates a new Discussion as part of this Communication.',
  })
  async createDiscussion(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('createData') createData: CommunicationCreateDiscussionInput
  ): Promise<IDiscussion> {
    const communication =
      await this.communicationService.getCommunicationOrFail(
        createData.communicationID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      communication.authorization,
      AuthorizationPrivilege.CREATE,
      `create discussion on communication: ${communication.id}`
    );

    const discussion = await this.communicationService.createDiscussion(
      createData,
      agentInfo.userID,
      agentInfo.communicationID
    );

    const payload =
      await this.notificationsPayloadBuilder.buildCommunicationDiscussionCreatedNotificationPayload(
        discussion
      );

    this.notificationsClient.emit<number>(
      EventType.COMMUNICATION_DISCUSSION_CREATED,
      payload
    );

    await this.discussionAuthorizationService.applyAuthorizationPolicy(
      discussion,
      communication.authorization
    );

    return await this.discussionService.save(discussion);
  }
}
