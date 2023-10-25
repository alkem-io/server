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
  DeleteCalloutInput,
  UpdateCalloutInput,
} from '@domain/collaboration/callout/dto';
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
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { ActivityInputCalloutPostCreated } from '@services/adapters/activity-adapter/dto/activity.dto.input.callout.post.created';
import { NotificationInputPostCreated } from '@services/adapters/notification-adapter/dto/notification.dto.input.post.created';
import { NotificationInputWhiteboardCreated } from '@services/adapters/notification-adapter/dto/notification.dto.input.whiteboard.created';
import { IReference } from '@domain/common/reference';
import { ActivityInputCalloutLinkCreated } from '@services/adapters/activity-adapter/dto/activity.dto.input.callout.link.created';
import { CreateContributionOnCalloutInput } from './dto/callout.dto.create.contribution';
import { ICalloutContribution } from '../callout-contribution/callout.contribution.interface';
import { CalloutContributionAuthorizationService } from '../callout-contribution/callout.contribution.service.authorization';
import { CalloutContributionService } from '../callout-contribution/callout.contribution.service';

@Resolver()
export class CalloutResolverMutations {
  constructor(
    private communityResolverService: CommunityResolverService,
    private contributionReporter: ContributionReporterService,
    private activityAdapter: ActivityAdapter,
    private notificationAdapter: NotificationAdapter,
    private authorizationService: AuthorizationService,
    private calloutService: CalloutService,
    private namingService: NamingService,
    private contributionAuthorizationService: CalloutContributionAuthorizationService,
    private calloutContributionService: CalloutContributionService,
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
    return await this.calloutService.updateCallout(calloutData, agentInfo);
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
      { relations: { framing: true } }
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
  @Mutation(() => ICalloutContribution, {
    description: 'Create a new Contribution on the Callout.',
  })
  @Profiling.api
  async createContributionOnCallout(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('contributionData') contributionData: CreateContributionOnCalloutInput
  ): Promise<ICalloutContribution> {
    const callout = await this.calloutService.getCalloutOrFail(
      contributionData.calloutID
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      callout.authorization,
      AuthorizationPrivilege.CONTRIBUTE,
      `create contribution on callout: ${callout.id}`
    );

    if (callout.contributionPolicy.state === CalloutState.CLOSED) {
      if (
        !this.authorizationService.isAccessGranted(
          agentInfo,
          callout.authorization,
          AuthorizationPrivilege.UPDATE
        )
      )
        throw new CalloutClosedException(
          `New contributions to a closed Callout with id: '${callout.id}' are not allowed!`
        );
    }

    let contribution = await this.calloutService.createContributionOnCallout(
      contributionData,
      agentInfo.userID
    );

    const communityPolicy =
      await this.namingService.getCommunityPolicyForCallout(callout.id);
    contribution =
      await this.contributionAuthorizationService.applyAuthorizationPolicy(
        contribution,
        callout.authorization,
        communityPolicy
      );

    if (contributionData.post && contribution.post) {
      const postCreatedEvent: CalloutPostCreatedPayload = {
        eventID: `callout-post-created-${Math.round(Math.random() * 100)}`,
        calloutID: callout.id,
        post: contribution.post,
      };
      await this.postCreatedSubscription.publish(
        SubscriptionType.CALLOUT_POST_CREATED,
        postCreatedEvent
      );

      if (callout.visibility === CalloutVisibility.PUBLISHED) {
        this.processActivityPostCreated(
          callout,
          contribution,
          contribution.post,
          agentInfo
        );
      }
    }

    if (contributionData.link && contribution.link) {
      if (callout.visibility === CalloutVisibility.PUBLISHED) {
        await this.processActivityLinkCreated(
          callout,
          contribution.link,
          agentInfo
        );
      }
    }

    if (contributionData.whiteboard && contribution.whiteboard) {
      if (callout.visibility === CalloutVisibility.PUBLISHED) {
        this.processActivityWhiteboardCreated(
          callout,
          contribution,
          contribution.whiteboard,
          agentInfo
        );
      }
    }

    return await this.calloutContributionService.save(contribution);
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

    this.contributionReporter.calloutLinkCreated(
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
    contribution: ICalloutContribution,
    whiteboard: IWhiteboard,
    agentInfo: AgentInfo
  ) {
    const notificationInput: NotificationInputWhiteboardCreated = {
      contribution: contribution,
      callout: callout,
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

    this.contributionReporter.calloutWhiteboardCreated(
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
    contribution: ICalloutContribution,
    post: IPost,
    agentInfo: AgentInfo
  ) {
    const notificationInput: NotificationInputPostCreated = {
      contribution: contribution,
      callout: callout,
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

    this.contributionReporter.calloutPostCreated(
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
