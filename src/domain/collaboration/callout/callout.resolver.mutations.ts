import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { Inject, UseGuards } from '@nestjs/common/decorators';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication';
import { CalloutService } from './callout.service';
import { IAspect } from '@domain/collaboration/aspect/aspect.interface';
import {
  CalloutAspectCreatedPayload,
  CreateAspectOnCalloutInput,
  CreateCanvasOnCalloutInput,
  DeleteCalloutInput,
  UpdateCalloutInput,
} from '@domain/collaboration/callout/dto';
import { CanvasAuthorizationService } from '@domain/common/canvas/canvas.service.authorization';
import { AspectAuthorizationService } from '@domain/collaboration/aspect/aspect.service.authorization';
import { SubscriptionType } from '@common/enums/subscription.type';
import { ICanvas } from '@domain/common/canvas/canvas.interface';
import {
  SUBSCRIPTION_CALLOUT_ASPECT_CREATED,
  SUBSCRIPTION_ROOM_MESSAGE,
} from '@common/constants';
import { PubSubEngine } from 'graphql-subscriptions';
import { ICallout } from './callout.interface';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import {
  EntityNotInitializedException,
  NotSupportedException,
} from '@src/common/exceptions';
import { CalloutType } from '@common/enums/callout.type';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { ActivityInputAspectCreated } from '@services/adapters/activity-adapter/dto/activity.dto.input.aspect.created';
import { ActivityInputCalloutPublished } from '@services/adapters/activity-adapter/dto/activity.dto.input.callout.published';
import { CalloutMessageReceivedPayload } from './dto/callout.message.received.payload';
import { ActivityInputCalloutDiscussionComment } from '@services/adapters/activity-adapter/dto/activity.dto.input.callout.discussion.comment';
import { UpdateCalloutVisibilityInput } from './dto/callout.dto.update.visibility';
import { NotificationInputAspectCreated } from '@services/adapters/notification-adapter/dto/notification.dto.input.aspect.created';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { NotificationInputCalloutPublished } from '@services/adapters/notification-adapter/dto/notification.dto.input.callout.published';
import { CalloutState } from '@common/enums/callout.state';
import { CalloutClosedException } from '@common/exceptions/callout/callout.closed.exception';
import { IMessage } from '@domain/communication/message/message.interface';
import { getRandomId } from '@common/utils/random.id.generator.util';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { NotificationInputCanvasCreated } from '@services/adapters/notification-adapter/dto/notification.dto.input.canvas.created';
import { NotificationInputDiscussionComment } from '@services/adapters/notification-adapter/dto/notification.dto.input.discussion.comment';
import { UpdateCalloutPublishInfoInput } from './dto/callout.dto.update.publish.info';
import { RoomType } from '@common/enums/room.type';
import { NotificationInputEntityMentions } from '@services/adapters/notification-adapter/dto/notification.dto.input.entity.mentions';
import { ElasticsearchService } from '@services/external/elasticsearch';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { getMentionsFromText } from '@domain/communication/messaging/get.mentions.from.text';
import { RoomService } from '@domain/communication/room/room.service';
import { RoomSendMessageInput } from '@domain/communication/room/dto/room.dto.send.message';
import { SendMessageOnCalloutInput } from './dto/callout.dto.message.created';

@Resolver()
export class CalloutResolverMutations {
  constructor(
    private communityResolverService: CommunityResolverService,
    private elasticService: ElasticsearchService,
    private activityAdapter: ActivityAdapter,
    private notificationAdapter: NotificationAdapter,
    private authorizationService: AuthorizationService,
    private calloutService: CalloutService,
    private namingService: NamingService,
    private roomService: RoomService,
    private canvasAuthorizationService: CanvasAuthorizationService,
    private aspectAuthorizationService: AspectAuthorizationService,
    @Inject(SUBSCRIPTION_CALLOUT_ASPECT_CREATED)
    private aspectCreatedSubscription: PubSubEngine,
    @Inject(SUBSCRIPTION_ROOM_MESSAGE)
    private subscriptionRoomMessage: PubSubEngine
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICallout, {
    description: 'Delete a Callout.',
  })
  @Profiling.api
  async deleteCallout(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteCalloutInput
  ): Promise<ICallout> {
    const callout = await this.calloutService.getCalloutOrFail(deleteData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      callout.authorization,
      AuthorizationPrivilege.DELETE,
      `delete callout: ${callout.id}`
    );
    return await this.calloutService.deleteCallout(deleteData.ID);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IMessage, {
    description: 'Send a message on a Comments Callout',
  })
  @Profiling.api
  async sendMessageOnCallout(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('data') data: SendMessageOnCalloutInput
  ): Promise<IMessage> {
    const callout = await this.calloutService.getCalloutOrFail(data.calloutID, {
      relations: ['profile'],
    });

    if (callout.type !== CalloutType.COMMENTS) {
      throw new NotSupportedException(
        'Messages only supported on Comments Callout',
        LogContext.COLLABORATION
      );
    }

    if (callout.state === CalloutState.CLOSED) {
      throw new CalloutClosedException(
        `New collaborations to a closed Callout with id: '${callout.id}' are not allowed!`
      );
    }

    const comments = await this.calloutService.getComments(data.calloutID);

    if (!comments) {
      throw new EntityNotInitializedException(
        `Comments not initialized on Callout with ID ${data.calloutID}`,
        LogContext.COLLABORATION
      );
    }

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      comments.authorization,
      AuthorizationPrivilege.CREATE_COMMENT,
      `comments send message: ${comments.displayName}`
    );

    const messageData: RoomSendMessageInput = {
      roomID: comments.id,
      message: data.message,
    };
    const commentSent = await this.roomService.sendMessage(
      comments,
      agentInfo.communicationID,
      messageData
    );
    // build subscription payload
    const subscriptionPayload: CalloutMessageReceivedPayload = {
      eventID: `callout-comment-msg-${getRandomId()}`,
      calloutID: data.calloutID,
      commentsID: comments.id,
      message: commentSent,
    };
    // send the subscriptions event
    this.subscriptionRoomMessage.publish(
      SubscriptionType.COMMUNICATION_ROOM_MESSAGE_RECEIVED,
      subscriptionPayload
    );
    if (callout.visibility === CalloutVisibility.PUBLISHED) {
      // Register the activity
      const activityLogInput: ActivityInputCalloutDiscussionComment = {
        triggeredBy: agentInfo.userID,
        callout: callout,
        message: commentSent,
      };
      this.activityAdapter.calloutCommentCreated(activityLogInput);

      const notificationInput: NotificationInputDiscussionComment = {
        callout: callout,
        triggeredBy: agentInfo.userID,
        comments,
        commentSent,
      };
      await this.notificationAdapter.discussionComment(notificationInput);

      const mentions = getMentionsFromText(commentSent.message);

      const entityMentionsNotificationInput: NotificationInputEntityMentions = {
        triggeredBy: agentInfo.userID,
        comment: commentSent.message,
        roomId: comments.id,
        mentions,
        originEntity: {
          id: callout.id,
          nameId: callout.nameID,
          displayName: callout.profile.displayName,
        },
        commentType: RoomType.DISCUSSION,
      };
      this.notificationAdapter.entityMentions(entityMentionsNotificationInput);
    }

    const { hubID } =
      await this.communityResolverService.getCommunityFromCalloutOrFail(
        callout.id
      );

    this.elasticService.calloutCommentCreated(
      {
        id: callout.id,
        name: callout.nameID,
        hub: hubID,
      },
      {
        id: agentInfo.userID,
        email: agentInfo.email,
      }
    );

    return commentSent;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICallout, {
    description: 'Update a Callout.',
  })
  @Profiling.api
  async updateCallout(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('calloutData') calloutData: UpdateCalloutInput
  ): Promise<ICallout> {
    const callout = await this.calloutService.getCalloutOrFail(calloutData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      callout.authorization,
      AuthorizationPrivilege.UPDATE,
      `update callout: ${callout.id}`
    );
    return await this.calloutService.updateCallout(calloutData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICallout, {
    description: 'Update the visibility of the specified Callout.',
  })
  @Profiling.api
  async updateCalloutVisibility(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('calloutData') calloutData: UpdateCalloutVisibilityInput
  ): Promise<ICallout> {
    const callout = await this.calloutService.getCalloutOrFail(
      calloutData.calloutID,
      { relations: ['profile'] }
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      callout.authorization,
      AuthorizationPrivilege.UPDATE,
      `update visibility on callout: ${callout.id}`
    );
    const oldVisibility = callout.visibility;
    const savedCallout = await this.calloutService.updateCalloutVisibility(
      calloutData
    );

    if (savedCallout.visibility !== oldVisibility) {
      if (savedCallout.visibility === CalloutVisibility.PUBLISHED) {
        // Save published info
        await this.calloutService.updateCalloutPublishInfo(
          savedCallout,
          agentInfo.userID,
          Date.now()
        );

        if (calloutData.sendNotification) {
          const notificationInput: NotificationInputCalloutPublished = {
            triggeredBy: agentInfo.userID,
            callout: callout,
          };
          await this.notificationAdapter.calloutPublished(notificationInput);
        }

        const activityLogInput: ActivityInputCalloutPublished = {
          triggeredBy: agentInfo.userID,
          callout: callout,
        };
        this.activityAdapter.calloutPublished(activityLogInput);
      }
    }

    return savedCallout;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICallout, {
    description:
      'Update the information describing the publishing of the specified Callout.',
  })
  @Profiling.api
  async updateCalloutPublishInfo(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('calloutData') calloutData: UpdateCalloutPublishInfoInput
  ): Promise<ICallout> {
    const callout = await this.calloutService.getCalloutOrFail(
      calloutData.calloutID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      callout.authorization,
      AuthorizationPrivilege.UPDATE_CALLOUT_PUBLISHER,
      `update publisher information on callout: ${callout.id}`
    );
    return await this.calloutService.updateCalloutPublishInfo(
      callout,
      calloutData.publisherID,
      calloutData.publishDate
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAspect, {
    description: 'Create a new Aspect on the Callout.',
  })
  @Profiling.api
  async createAspectOnCallout(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('aspectData') aspectData: CreateAspectOnCalloutInput
  ): Promise<IAspect> {
    const callout = await this.calloutService.getCalloutOrFail(
      aspectData.calloutID
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      callout.authorization,
      AuthorizationPrivilege.CREATE_ASPECT,
      `create aspect on callout: ${callout.id}`
    );

    if (callout.state === CalloutState.CLOSED) {
      throw new CalloutClosedException(
        `New collaborations to a closed Callout with id: '${callout.id}' are not allowed!`
      );
    }

    let aspect = await this.calloutService.createAspectOnCallout(
      aspectData,
      agentInfo.userID
    );

    const communityPolicy =
      await this.namingService.getCommunityPolicyForCallout(callout.id);
    aspect = await this.aspectAuthorizationService.applyAuthorizationPolicy(
      aspect,
      callout.authorization,
      communityPolicy
    );
    const aspectCreatedEvent: CalloutAspectCreatedPayload = {
      eventID: `callout-aspect-created-${Math.round(Math.random() * 100)}`,
      calloutID: callout.id,
      aspect,
    };
    await this.aspectCreatedSubscription.publish(
      SubscriptionType.CALLOUT_ASPECT_CREATED,
      aspectCreatedEvent
    );

    if (callout.visibility === CalloutVisibility.PUBLISHED) {
      const notificationInput: NotificationInputAspectCreated = {
        aspect: aspect,
        triggeredBy: agentInfo.userID,
      };
      await this.notificationAdapter.aspectCreated(notificationInput);

      const activityLogInput: ActivityInputAspectCreated = {
        triggeredBy: agentInfo.userID,
        aspect: aspect,
        callout: callout,
      };
      this.activityAdapter.aspectCreated(activityLogInput);

      const { hubID } =
        await this.communityResolverService.getCommunityFromCalloutOrFail(
          aspectData.calloutID
        );

      this.elasticService.calloutCardCreated(
        {
          id: aspect.id,
          name: aspect.profile.displayName,
          hub: hubID,
        },
        {
          id: agentInfo.userID,
          email: agentInfo.email,
        }
      );
    }

    return aspect;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICanvas, {
    description: 'Create a new Canvas on the Callout.',
  })
  @Profiling.api
  async createCanvasOnCallout(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('canvasData') canvasData: CreateCanvasOnCalloutInput
  ): Promise<ICanvas> {
    const callout = await this.calloutService.getCalloutOrFail(
      canvasData.calloutID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      callout.authorization,
      AuthorizationPrivilege.CREATE_CANVAS,
      `create canvas on callout: ${callout.id}`
    );

    if (callout.state === CalloutState.CLOSED) {
      throw new CalloutClosedException(
        `New collaborations to a closed Callout with id: '${callout.id}' are not allowed!`
      );
    }

    const canvas = await this.calloutService.createCanvasOnCallout(
      canvasData,
      agentInfo.userID
    );

    const authorizedCanvas =
      await this.canvasAuthorizationService.applyAuthorizationPolicy(
        canvas,
        callout.authorization
      );

    if (callout.visibility === CalloutVisibility.PUBLISHED) {
      const notificationInput: NotificationInputCanvasCreated = {
        canvas: canvas,
        triggeredBy: agentInfo.userID,
      };
      await this.notificationAdapter.canvasCreated(notificationInput);

      this.activityAdapter.canvasCreated({
        triggeredBy: agentInfo.userID,
        canvas: authorizedCanvas,
        callout: callout,
      });

      const { hubID } =
        await this.communityResolverService.getCommunityFromCalloutOrFail(
          canvasData.calloutID
        );

      this.elasticService.calloutCanvasCreated(
        {
          id: canvas.id,
          name: canvas.nameID,
          hub: hubID,
        },
        {
          id: agentInfo.userID,
          email: agentInfo.email,
        }
      );
    }

    return authorizedCanvas;
  }
}
