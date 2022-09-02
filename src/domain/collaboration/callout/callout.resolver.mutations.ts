import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { Inject, UseGuards } from '@nestjs/common/decorators';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication';
import { CalloutService } from './callout.service';
import { IAspect } from '@domain/collaboration/aspect';
import {
  CalloutAspectCreated,
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
  NOTIFICATIONS_SERVICE,
  SUBSCRIPTION_CALLOUT_ASPECT_CREATED,
} from '@common/constants';
import { ClientProxy } from '@nestjs/microservices';
import { PubSubEngine } from 'graphql-subscriptions';
import { NotificationsPayloadBuilder } from '@core/microservices';
import { EventType } from '@common/enums/event.type';
import { ICallout } from './callout.interface';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { ActivityAdapter } from '@services/platform/activity-adapter/activity.adapter';
import { ActivityInputAspectCreated } from '@services/platform/activity-adapter/dto/activity.dto.input.aspect.created';
import { ActivityInputCalloutPublished } from '@services/platform/activity-adapter/dto/activity.dto.input.callout.published';

@Resolver()
export class CalloutResolverMutations {
  constructor(
    private activityAdapter: ActivityAdapter,
    private authorizationService: AuthorizationService,
    private calloutService: CalloutService,
    private canvasAuthorizationService: CanvasAuthorizationService,
    private aspectAuthorizationService: AspectAuthorizationService,
    @Inject(SUBSCRIPTION_CALLOUT_ASPECT_CREATED)
    private aspectCreatedSubscription: PubSubEngine,
    private notificationsPayloadBuilder: NotificationsPayloadBuilder,
    @Inject(NOTIFICATIONS_SERVICE) private notificationsClient: ClientProxy
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
    const result = await this.calloutService.updateCallout(calloutData);

    if (result.visibility === CalloutVisibility.PUBLISHED) {
      const payload =
        await this.notificationsPayloadBuilder.buildCalloutPublishedPayload(
          agentInfo.userID,
          result
        );

      this.notificationsClient.emit<number>(
        EventType.CALLOUT_PUBLISHED,
        payload
      );

      const activityLogInput: ActivityInputCalloutPublished = {
        triggeredBy: agentInfo.userID,
        resourceID: callout.id,
        description: callout.description,
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
    let aspect = await this.calloutService.createAspectOnCallout(
      aspectData,
      agentInfo.userID
    );
    aspect = await this.aspectAuthorizationService.applyAuthorizationPolicy(
      aspect,
      callout.authorization
    );
    const aspectCreatedEvent: CalloutAspectCreated = {
      eventID: `callout-aspect-created-${Math.round(Math.random() * 100)}`,
      calloutID: callout.id,
      aspect,
    };
    await this.aspectCreatedSubscription.publish(
      SubscriptionType.CALLOUT_ASPECT_CREATED,
      aspectCreatedEvent
    );

    const payload =
      await this.notificationsPayloadBuilder.buildAspectCreatedPayload(
        aspect.id
      );

    this.notificationsClient.emit<number>(EventType.ASPECT_CREATED, payload);

    const activityLogInput: ActivityInputAspectCreated = {
      triggeredBy: agentInfo.userID,
      resourceID: aspect.id,
      description: `[${aspectData.type}] New Card created with title: ${aspect.displayName}`,
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
    const canvas = await this.calloutService.createCanvasOnCallout(
      canvasData,
      agentInfo.userID
    );
    return await this.canvasAuthorizationService.applyAuthorizationPolicy(
      canvas,
      callout.authorization
    );
  }
}
