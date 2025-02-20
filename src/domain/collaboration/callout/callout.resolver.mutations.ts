import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { Inject, UseGuards } from '@nestjs/common/decorators';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { CalloutService } from './callout.service';
import { IPost } from '@domain/collaboration/post/post.interface';
import {
  CalloutPostCreatedPayload,
  DeleteCalloutInput,
  UpdateCalloutEntityInput,
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
import { ActivityInputCalloutLinkCreated } from '@services/adapters/activity-adapter/dto/activity.dto.input.callout.link.created';
import { CreateContributionOnCalloutInput } from './dto/callout.dto.create.contribution';
import { ICalloutContribution } from '../callout-contribution/callout.contribution.interface';
import { CalloutContributionAuthorizationService } from '../callout-contribution/callout.contribution.service.authorization';
import { CalloutContributionService } from '../callout-contribution/callout.contribution.service';
import { ILink } from '../link/link.interface';
import { RelationshipNotFoundException } from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { UpdateContributionCalloutsSortOrderInput } from '../callout-contribution/dto/callout.contribution.dto.update.callouts.sort.order';
import { TemporaryStorageService } from '@services/infrastructure/temporary-storage/temporary.storage.service';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class CalloutResolverMutations {
  constructor(
    private communityResolverService: CommunityResolverService,
    private contributionReporter: ContributionReporterService,
    private activityAdapter: ActivityAdapter,
    private notificationAdapter: NotificationAdapter,
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private calloutService: CalloutService,
    private namingService: NamingService,
    private contributionAuthorizationService: CalloutContributionAuthorizationService,
    private calloutContributionService: CalloutContributionService,
    private temporaryStorageService: TemporaryStorageService,
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
    @Args('calloutData') calloutData: UpdateCalloutEntityInput
  ): Promise<ICallout> {
    const callout = await this.calloutService.getCalloutOrFail(calloutData.ID);
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      callout.authorization,
      AuthorizationPrivilege.UPDATE,
      `update callout: ${callout.id}`
    );
    return await this.calloutService.updateCallout(callout, calloutData);
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
      { relations: { framing: true, calloutsSet: true } }
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      callout.authorization,
      AuthorizationPrivilege.UPDATE,
      `update visibility on callout: ${callout.id}`
    );
    const oldVisibility = callout.visibility;
    const savedCallout =
      await this.calloutService.updateCalloutVisibility(calloutData);

    if (!savedCallout.isTemplate && savedCallout.visibility !== oldVisibility) {
      if (savedCallout.visibility === CalloutVisibility.PUBLISHED) {
        // Save published info
        await this.calloutService.updateCalloutPublishInfo(
          savedCallout,
          agentInfo.userID,
          Date.now()
        );

        if (callout.calloutsSet?.type === CalloutsSetType.COLLABORATION) {
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
      contributionData.calloutID,
      {
        relations: {
          calloutsSet: true,
        },
      }
    );
    if (!callout.calloutsSet) {
      throw new RelationshipNotFoundException(
        `Callout ${callout.id} has no calloutSet relationship`,
        LogContext.COLLABORATION
      );
    }

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

    const { roleSet, spaceSettings } =
      await this.namingService.getRoleSetAndSettingsForCallout(callout.id);

    contribution = await this.calloutContributionService.save(contribution);

    const destinationStorageBucket =
      await this.calloutContributionService.getStorageBucketForContribution(
        contribution.id
      );
    // Now the contribution is saved, we can look to move any temporary documents
    // to be stored in the storage bucket of the profile.
    // Note: important to do before auth reset is done
    await this.temporaryStorageService.moveTemporaryDocuments(
      contributionData,
      destinationStorageBucket
    );
    const updatedAuthorizations =
      await this.contributionAuthorizationService.applyAuthorizationPolicy(
        contribution.id,
        callout.authorization,
        roleSet,
        spaceSettings
      );
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    if (contributionData.post && contribution.post) {
      const postCreatedEvent: CalloutPostCreatedPayload = {
        eventID: `callout-post-created-${Math.round(Math.random() * 100)}`,
        calloutID: callout.id,
        contributionID: contribution.id,
        sortOrder: contribution.sortOrder,
        post: {
          // Removing the storageBucket from the post because it cannot be stringified
          // due to a circular reference (storageBucket => documents[] => storageBucket)
          // The client is not querying it from the subscription anyway.
          ...contribution.post,
          profile: {
            ...contribution.post.profile,
            storageBucket: undefined,
          },
        },
      };
      this.postCreatedSubscription.publish(
        SubscriptionType.CALLOUT_POST_CREATED,
        postCreatedEvent
      );
    }

    //toDo - rework activities also for CalloutSetType.KNOWLEDGE_BASE
    // Get the levelZeroSpaceID for the callout
    if (callout.calloutsSet.type === CalloutsSetType.COLLABORATION) {
      const levelZeroSpaceID =
        await this.communityResolverService.getLevelZeroSpaceIdForCalloutsSet(
          callout.calloutsSet.id
        );

      if (contributionData.post && contribution.post) {
        if (callout.visibility === CalloutVisibility.PUBLISHED) {
          this.processActivityPostCreated(
            callout,
            contribution,
            contribution.post,
            levelZeroSpaceID,
            agentInfo
          );
        }
      }

      if (contributionData.link && contribution.link) {
        if (callout.visibility === CalloutVisibility.PUBLISHED) {
          this.processActivityLinkCreated(
            callout,
            contribution.link,
            levelZeroSpaceID,
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
            levelZeroSpaceID,
            agentInfo
          );
        }
      }
    }

    return await this.calloutContributionService.getCalloutContributionOrFail(
      contribution.id
    );
  }

  private async processActivityLinkCreated(
    callout: ICallout,
    link: ILink,
    levelZeroSpaceID: string,
    agentInfo: AgentInfo
  ) {
    const activityLogInput: ActivityInputCalloutLinkCreated = {
      triggeredBy: agentInfo.userID,
      link: link,
      callout: callout,
    };
    this.activityAdapter.calloutLinkCreated(activityLogInput);

    this.contributionReporter.calloutLinkCreated(
      {
        id: link.id,
        name: link.profile.displayName,
        space: levelZeroSpaceID,
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
    levelZeroSpaceID: string,
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

    this.contributionReporter.calloutWhiteboardCreated(
      {
        id: whiteboard.id,
        name: whiteboard.nameID,
        space: levelZeroSpaceID,
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
    levelZeroSpaceID: string,
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

    this.contributionReporter.calloutPostCreated(
      {
        id: post.id,
        name: post.profile.displayName,
        space: levelZeroSpaceID,
      },
      {
        id: agentInfo.userID,
        email: agentInfo.email,
      }
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => [ICalloutContribution], {
    description:
      'Update the sortOrder field of the Contributions of s Callout.',
  })
  @Profiling.api
  async updateContributionsSortOrder(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('sortOrderData')
    sortOrderData: UpdateContributionCalloutsSortOrderInput
  ): Promise<ICalloutContribution[]> {
    const callout = await this.calloutService.getCalloutOrFail(
      sortOrderData.calloutID
    );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      callout.authorization,
      AuthorizationPrivilege.UPDATE,
      `update contribution sort order on callout: ${sortOrderData.calloutID}`
    );

    return this.calloutService.updateContributionCalloutsSortOrder(
      sortOrderData.calloutID,
      sortOrderData
    );
  }
}
