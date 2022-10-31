import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { Inject, UseGuards } from '@nestjs/common/decorators';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication';
import { CalloutService } from './callout.service';
import { IAspect } from '@domain/collaboration/aspect';
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
import { ICanvas } from '@domain/common/canvas';
import {
  SUBSCRIPTION_CALLOUT_ASPECT_CREATED,
  SUBSCRIPTION_CALLOUT_MESSAGE_CREATED,
} from '@common/constants';
import { PubSubEngine } from 'graphql-subscriptions';
import { ICallout } from './callout.interface';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import {
  EntityNotInitializedException,
  getRandomId,
  NotSupportedException,
} from '@src/common';
import { CommentsService } from '@domain/communication/comments/comments.service';
import { SendMessageOnCalloutInput } from './dto/callout.args.message.created';
import { CalloutType } from '@common/enums/callout.type';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { ActivityInputAspectCreated } from '@services/adapters/activity-adapter/dto/activity.dto.input.aspect.created';
import { ActivityInputCalloutPublished } from '@services/adapters/activity-adapter/dto/activity.dto.input.callout.published';
import { ActivityInputCanvasCreated } from '@services/adapters/activity-adapter/dto/activity.dto.input.canvas.created';
import { CalloutMessageReceivedPayload } from './dto/callout.message.received.payload';
import { ActivityInputCalloutDiscussionComment } from '@services/adapters/activity-adapter/dto/activity.dto.input.callout.discussion.comment';
import { UpdateCalloutVisibilityInput } from './dto/callout.dto.update.visibility';
import { NotificationInputAspectCreated } from '@services/adapters/notification-adapter/dto/notification.dto.input.aspect.created';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { NotificationInputCalloutPublished } from '@services/adapters/notification-adapter/dto/notification.dto.input.callout.published';
import { CalloutState } from '@common/enums/callout.state';
import { CalloutClosedException } from '@common/exceptions/callout/callout.closed.exception';
import { IMessage } from '@domain/communication/message/message.interface';

@Resolver()
export class CalloutResolverMutations {
  constructor(
    private activityAdapter: ActivityAdapter,
    private notificationAdapter: NotificationAdapter,
    private authorizationService: AuthorizationService,
    private calloutService: CalloutService,
    private commentsService: CommentsService,
    private canvasAuthorizationService: CanvasAuthorizationService,
    private aspectAuthorizationService: AspectAuthorizationService,
    @Inject(SUBSCRIPTION_CALLOUT_ASPECT_CREATED)
    private aspectCreatedSubscription: PubSubEngine,
    @Inject(SUBSCRIPTION_CALLOUT_MESSAGE_CREATED)
    private calloutMessageCreatedSubscription: PubSubEngine
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
    const callout = await this.calloutService.getCalloutOrFail(data.calloutID);

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

    const comments = await this.calloutService.getCommentsFromCallout(
      data.calloutID
    );

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

    const commentSent = await this.commentsService.sendCommentsMessage(
      comments,
      agentInfo.communicationID,
      { message: data.message }
    );
    // build subscription payload
    const subscriptionPayload: CalloutMessageReceivedPayload = {
      eventID: `callout-comment-msg-${getRandomId()}`,
      calloutID: data.calloutID,
      commentsID: comments.id,
      message: commentSent,
    };
    // send the subscriptions event
    this.calloutMessageCreatedSubscription.publish(
      SubscriptionType.CALLOUT_MESSAGE_CREATED,
      subscriptionPayload
    );
    // Register the activity
    const activityLogInput: ActivityInputCalloutDiscussionComment = {
      triggeredBy: agentInfo.userID,
      callout: callout,
      message: data.message,
    };
    await this.activityAdapter.calloutCommentCreated(activityLogInput);

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
      calloutData.calloutID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      callout.authorization,
      AuthorizationPrivilege.UPDATE,
      `update visibility on callout: ${callout.id}`
    );
    const oldVisibility = callout.visibility;
    const result = await this.calloutService.updateCalloutVisibility(
      calloutData
    );

    if (
      oldVisibility === CalloutVisibility.DRAFT &&
      result.visibility === CalloutVisibility.PUBLISHED
    ) {
      const notificationInput: NotificationInputCalloutPublished = {
        triggeredBy: agentInfo.userID,
        callout: callout,
      };
      await this.notificationAdapter.calloutPublished(notificationInput);

      const activityLogInput: ActivityInputCalloutPublished = {
        triggeredBy: agentInfo.userID,
        callout: callout,
      };
      await this.activityAdapter.calloutPublished(activityLogInput);
    }

    return result;
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
    await this.authorizationService.grantAccessOrFail(
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
    aspect = await this.aspectAuthorizationService.applyAuthorizationPolicy(
      aspect,
      callout.authorization
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
    await this.activityAdapter.aspectCreated(activityLogInput);

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
    const activityLogInput: ActivityInputCanvasCreated = {
      triggeredBy: agentInfo.userID,
      canvas: canvas,
      callout: callout,
    };
    await this.activityAdapter.canvasCreated(activityLogInput);
    return await this.canvasAuthorizationService.applyAuthorizationPolicy(
      canvas,
      callout.authorization
    );
  }
}
