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
  DeleteCanvasOnCalloutInput,
  DeleteAspectOnCalloutInput,
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
import { CanvasService } from '@domain/common/canvas/canvas.service';
import { AspectService } from '@domain/collaboration/aspect/aspect.service';

@Resolver()
export class CalloutResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private canvasService: CanvasService,
    private aspectService: AspectService,
    private calloutService: CalloutService,
    private canvasAuthorizationService: CanvasAuthorizationService,
    private aspectAuthorizationService: AspectAuthorizationService,
    @Inject(SUBSCRIPTION_CALLOUT_ASPECT_CREATED)
    private aspectCreatedSubscription: PubSubEngine,
    private notificationsPayloadBuilder: NotificationsPayloadBuilder,
    @Inject(NOTIFICATIONS_SERVICE) private notificationsClient: ClientProxy
  ) {}

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
      SubscriptionType.CONTEXT_ASPECT_CREATED,
      aspectCreatedEvent
    );

    const payload =
      await this.notificationsPayloadBuilder.buildAspectCreatedPayload(
        aspect.id
      );

    this.notificationsClient.emit<number>(EventType.ASPECT_CREATED, payload);

    return aspect;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAspect, {
    description: 'Deletes the specified Aspect.',
  })
  async deleteAspectOnCallout(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteAspectOnCalloutInput
  ): Promise<IAspect> {
    const aspect = await this.calloutService.getApectOnCalloutOrFail(
      deleteData.calloutID,
      deleteData.aspectID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      aspect.authorization,
      AuthorizationPrivilege.DELETE,
      `delete aspect: ${aspect.id}`
    );
    return await this.aspectService.deleteAspect({ ID: deleteData.aspectID });
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
    const canvas = await this.calloutService.createCanvasOnCallout(canvasData);
    return await this.canvasAuthorizationService.applyAuthorizationPolicy(
      canvas,
      callout.authorization
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICanvas, {
    description: 'Deletes the specified Canvas.',
  })
  async deleteCanvasOnCallout(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteCanvasOnCalloutInput
  ): Promise<ICanvas> {
    const canvas = await this.calloutService.getCanvasOnCalloutOrFail(
      deleteData.calloutID,
      deleteData.canvasID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      canvas.authorization,
      AuthorizationPrivilege.DELETE,
      `delete canvas: ${canvas.id}`
    );
    return await this.canvasService.deleteCanvas(deleteData.canvasID);
  }
}
