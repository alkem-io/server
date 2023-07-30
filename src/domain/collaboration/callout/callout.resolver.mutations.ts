import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { Inject, UseGuards } from '@nestjs/common/decorators';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication';
import { CalloutService } from './callout.service';
import { IPost } from '@domain/collaboration/post/post.interface';
import {
  CalloutPostCreatedPayload,
  CreatePostOnCalloutInput,
  CreateWhiteboardOnCalloutInput,
  DeleteCalloutInput,
  UpdateCalloutInput,
} from '@domain/collaboration/callout/dto';
import { WhiteboardAuthorizationService } from '@domain/common/whiteboard/whiteboard.service.authorization';
import { PostAuthorizationService } from '@domain/collaboration/post/post.service.authorization';
import { SubscriptionType } from '@common/enums/subscription.type';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { SUBSCRIPTION_CALLOUT_POST_CREATED } from '@common/constants';
import { PubSubEngine } from 'graphql-subscriptions';
import { ICallout } from './callout.interface';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { ActivityInputCalloutPublished } from '@services/adapters/activity-adapter/dto/activity.dto.input.callout.published';
import { UpdateCalloutVisibilityInput } from './dto/callout.dto.update.visibility';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { NotificationInputCalloutPublished } from '@services/adapters/notification-adapter/dto/notification.dto.input.callout.published';
import { CalloutState } from '@common/enums/callout.state';
import { CalloutClosedException } from '@common/exceptions/callout/callout.closed.exception';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { UpdateCalloutPublishInfoInput } from './dto/callout.dto.update.publish.info';
import { ElasticsearchService } from '@services/external/elasticsearch';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { ActivityInputCalloutPostCreated } from '@services/adapters/activity-adapter/dto/activity.dto.input.callout.post.created';
import { NotificationInputPostCreated } from '@services/adapters/notification-adapter/dto/notification.dto.input.post.created';
import { NotificationInputWhiteboardCreated } from '@services/adapters/notification-adapter/dto/notification.dto.input.whiteboard.created';
import { IReference } from '@domain/common/reference';
import { CreateLinkOnCalloutInput } from './dto/callout.dto.create.link';
import { ActivityInputCalloutLinkCreated } from '@services/adapters/activity-adapter/dto/activity.dto.input.callout.link.created';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ReferenceService } from '@domain/common/reference/reference.service';

@Resolver()
export class CalloutResolverMutations {
  constructor(
    private communityResolverService: CommunityResolverService,
    private elasticService: ElasticsearchService,
    private activityAdapter: ActivityAdapter,
    private notificationAdapter: NotificationAdapter,
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private calloutService: CalloutService,
    private namingService: NamingService,
    private whiteboardAuthorizationService: WhiteboardAuthorizationService,
    private postAuthorizationService: PostAuthorizationService,
    private referenceService: ReferenceService,
    @Inject(SUBSCRIPTION_CALLOUT_POST_CREATED)
    private postCreatedSubscription: PubSubEngine
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
  @Mutation(() => IPost, {
    description: 'Create a new Post on the Callout.',
  })
  @Profiling.api
  async createPostOnCallout(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('postData') postData: CreatePostOnCalloutInput
  ): Promise<IPost> {
    const callout = await this.calloutService.getCalloutOrFail(
      postData.calloutID
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      callout.authorization,
      AuthorizationPrivilege.CREATE_POST,
      `create post on callout: ${callout.id}`
    );

    if (callout.state === CalloutState.CLOSED) {
      throw new CalloutClosedException(
        `New collaborations to a closed Callout with id: '${callout.id}' are not allowed!`
      );
    }

    let post = await this.calloutService.createPostOnCallout(
      postData,
      agentInfo.userID
    );

    const communityPolicy =
      await this.namingService.getCommunityPolicyForCallout(callout.id);
    post = await this.postAuthorizationService.applyAuthorizationPolicy(
      post,
      callout.authorization,
      communityPolicy
    );
    const postCreatedEvent: CalloutPostCreatedPayload = {
      eventID: `callout-post-created-${Math.round(Math.random() * 100)}`,
      calloutID: callout.id,
      post,
    };
    await this.postCreatedSubscription.publish(
      SubscriptionType.CALLOUT_POST_CREATED,
      postCreatedEvent
    );

    if (callout.visibility === CalloutVisibility.PUBLISHED) {
      this.processActivityPostCreated(callout, post, agentInfo);
    }

    return post;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IWhiteboard, {
    description: 'Create a new Whiteboard on the Callout.',
  })
  @Profiling.api
  async createWhiteboardOnCallout(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('whiteboardData') whiteboardData: CreateWhiteboardOnCalloutInput
  ): Promise<IWhiteboard> {
    const callout = await this.calloutService.getCalloutOrFail(
      whiteboardData.calloutID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      callout.authorization,
      AuthorizationPrivilege.CREATE_WHITEBOARD,
      `create whiteboard on callout: ${callout.id}`
    );

    if (callout.state === CalloutState.CLOSED) {
      throw new CalloutClosedException(
        `New collaborations to a closed Callout with id: '${callout.id}' are not allowed!`
      );
    }

    const whiteboard = await this.calloutService.createWhiteboardOnCallout(
      whiteboardData,
      agentInfo.userID
    );

    const authorizedWhiteboard =
      await this.whiteboardAuthorizationService.applyAuthorizationPolicy(
        whiteboard,
        callout.authorization
      );

    if (callout.visibility === CalloutVisibility.PUBLISHED) {
      this.processActivityWhiteboardCreated(
        callout,
        authorizedWhiteboard,
        agentInfo
      );
    }

    return authorizedWhiteboard;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IReference, {
    description: 'Create a new Link on the Callout.',
  })
  @Profiling.api
  async createLinkOnCallout(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('linkData') postData: CreateLinkOnCalloutInput
  ): Promise<IReference> {
    const callout = await this.calloutService.getCalloutOrFail(
      postData.calloutID,
      { relations: ['profile'] }
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      callout.authorization,
      AuthorizationPrivilege.CREATE_POST,
      `create link on callout: ${callout.id}`
    );

    if (callout.state === CalloutState.CLOSED) {
      throw new CalloutClosedException(
        `New collaborations to a closed Callout with id: '${callout.id}' are not allowed!`
      );
    }

    const reference = await this.calloutService.createLinkOnCallout(postData);
    reference.authorization =
      await this.authorizationPolicyService.inheritParentAuthorization(
        reference.authorization,
        callout.profile.authorization
      );
    const referenceAuthorized = await this.referenceService.saveReference(
      reference
    );

    if (callout.visibility === CalloutVisibility.PUBLISHED) {
      await this.processActivityLinkCreated(
        callout,
        referenceAuthorized,
        agentInfo
      );
    }

    return referenceAuthorized;
  }

  private async processActivityLinkCreated(
    callout: ICallout,
    reference: IReference,
    agentInfo: AgentInfo
  ) {
    const activityLogInput: ActivityInputCalloutLinkCreated = {
      triggeredBy: agentInfo.userID,
      reference: reference,
      callout: callout,
    };
    this.activityAdapter.calloutLinkCreated(activityLogInput);

    const { spaceID } =
      await this.communityResolverService.getCommunityFromCalloutOrFail(
        callout.id
      );

    this.elasticService.calloutLinkCreated(
      {
        id: reference.id,
        name: reference.name,
        space: spaceID,
      },
      {
        id: agentInfo.userID,
        email: agentInfo.email,
      }
    );
  }

  private async processActivityWhiteboardCreated(
    callout: ICallout,
    whiteboard: IWhiteboard,
    agentInfo: AgentInfo
  ) {
    const notificationInput: NotificationInputWhiteboardCreated = {
      whiteboard: whiteboard,
      triggeredBy: agentInfo.userID,
    };
    await this.notificationAdapter.whiteboardCreated(notificationInput);

    this.activityAdapter.calloutWhiteboardCreated({
      triggeredBy: agentInfo.userID,
      whiteboard: whiteboard,
      callout: callout,
    });

    const { spaceID } =
      await this.communityResolverService.getCommunityFromCalloutOrFail(
        callout.id
      );

    this.elasticService.calloutWhiteboardCreated(
      {
        id: whiteboard.id,
        name: whiteboard.nameID,
        space: spaceID,
      },
      {
        id: agentInfo.userID,
        email: agentInfo.email,
      }
    );
  }

  private async processActivityPostCreated(
    callout: ICallout,
    post: IPost,
    agentInfo: AgentInfo
  ) {
    const notificationInput: NotificationInputPostCreated = {
      post: post,
      triggeredBy: agentInfo.userID,
    };
    await this.notificationAdapter.postCreated(notificationInput);

    const activityLogInput: ActivityInputCalloutPostCreated = {
      triggeredBy: agentInfo.userID,
      post: post,
      callout: callout,
    };
    this.activityAdapter.calloutPostCreated(activityLogInput);

    const { spaceID } =
      await this.communityResolverService.getCommunityFromCalloutOrFail(
        callout.id
      );

    this.elasticService.calloutPostCreated(
      {
        id: post.id,
        name: post.profile.displayName,
        space: spaceID,
      },
      {
        id: agentInfo.userID,
        email: agentInfo.email,
      }
    );
  }
}
