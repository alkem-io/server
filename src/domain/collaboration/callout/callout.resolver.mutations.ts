import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
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
import { SUBSCRIPTION_CALLOUT_ASPECT_CREATED } from '@common/constants';
import { PubSubEngine } from 'graphql-subscriptions';
import { ICallout } from './callout.interface';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { ActivityInputAspectCreated } from '@services/adapters/activity-adapter/dto/activity.dto.input.aspect.created';
import { ActivityInputCalloutPublished } from '@services/adapters/activity-adapter/dto/activity.dto.input.callout.published';
import { UpdateCalloutVisibilityInput } from './dto/callout.dto.update.visibility';
import { NotificationInputAspectCreated } from '@services/adapters/notification-adapter/dto/notification.dto.input.aspect.created';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { NotificationInputCalloutPublished } from '@services/adapters/notification-adapter/dto/notification.dto.input.callout.published';
import { CalloutState } from '@common/enums/callout.state';
import { CalloutClosedException } from '@common/exceptions/callout/callout.closed.exception';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { NotificationInputCanvasCreated } from '@services/adapters/notification-adapter/dto/notification.dto.input.canvas.created';
import { UpdateCalloutPublishInfoInput } from './dto/callout.dto.update.publish.info';
import { ElasticsearchService } from '@services/external/elasticsearch';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { RoomService } from '@domain/communication/room/room.service';
import { RoomServiceEvents } from '@domain/communication/room/room.service.events';

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
    private roomServiceEvents: RoomServiceEvents,
    private canvasAuthorizationService: CanvasAuthorizationService,
    private aspectAuthorizationService: AspectAuthorizationService,
    @Inject(SUBSCRIPTION_CALLOUT_ASPECT_CREATED)
    private aspectCreatedSubscription: PubSubEngine
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
