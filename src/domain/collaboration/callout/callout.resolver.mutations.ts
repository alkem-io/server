import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentActor } from '@src/common/decorators';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { Inject } from '@nestjs/common/decorators';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ActorContext } from '@core/actor-context';
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
import { NotificationInputCalloutPublished } from '@services/adapters/notification-adapter/dto/space/notification.dto.input.space.collaboration.callout.published';
import { CalloutAllowedContributors } from '@common/enums/callout.allowed.contributors';
import { CalloutClosedException } from '@common/exceptions/callout/callout.closed.exception';
import { UpdateCalloutPublishInfoInput } from './dto/callout.dto.update.publish.info';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { ActivityInputCalloutPostCreated } from '@services/adapters/activity-adapter/dto/activity.dto.input.callout.post.created';
import { ActivityInputCalloutLinkCreated } from '@services/adapters/activity-adapter/dto/activity.dto.input.callout.link.created';
import { ActivityInputCalloutMemoCreated } from '@services/adapters/activity-adapter/dto/activity.dto.input.callout.memo.created';
import { CreateContributionOnCalloutInput } from './dto/callout.dto.create.contribution';
import { ICalloutContribution } from '../callout-contribution/callout.contribution.interface';
import { CalloutContributionAuthorizationService } from '../callout-contribution/callout.contribution.service.authorization';
import { CalloutContributionService } from '../callout-contribution/callout.contribution.service';
import { CalloutAuthorizationService } from './callout.service.authorization';
import { ILink } from '../link/link.interface';
import { RelationshipNotFoundException } from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { UpdateContributionCalloutsSortOrderInput } from '../callout-contribution/dto/callout.contribution.dto.update.callouts.sort.order';
import { TemporaryStorageService } from '@services/infrastructure/temporary-storage/temporary.storage.service';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { InstrumentResolver } from '@src/apm/decorators';
import { NotificationSpaceAdapter } from '@services/adapters/notification-adapter/notification.space.adapter';
import { NotificationInputCollaborationCalloutContributionCreated } from '@services/adapters/notification-adapter/dto/space/notification.dto.input.space.collaboration.callout.contribution.created';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { RoomResolverService } from '@services/infrastructure/entity-resolver/room.resolver.service';
import { IMemo } from '@domain/common/memo/types';

@InstrumentResolver()
@Resolver()
export class CalloutResolverMutations {
  constructor(
    private communityResolverService: CommunityResolverService,
    private contributionReporter: ContributionReporterService,
    private activityAdapter: ActivityAdapter,
    private notificationAdapterSpace: NotificationSpaceAdapter,
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private calloutService: CalloutService,
    private calloutAuthorizationService: CalloutAuthorizationService,
    private roomResolverService: RoomResolverService,
    private contributionAuthorizationService: CalloutContributionAuthorizationService,
    private calloutContributionService: CalloutContributionService,
    private temporaryStorageService: TemporaryStorageService,
    @Inject(SUBSCRIPTION_CALLOUT_POST_CREATED)
    private postCreatedSubscription: PubSubEngine
  ) {}

  @Mutation(() => ICallout, {
    description: 'Delete a Callout.',
  })
  async deleteCallout(
    @CurrentActor() actorContext: ActorContext,
    @Args('deleteData') deleteData: DeleteCalloutInput
  ): Promise<ICallout> {
    const callout = await this.calloutService.getCalloutOrFail(deleteData.ID);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      callout.authorization,
      AuthorizationPrivilege.DELETE,
      `delete callout: ${callout.id}`
    );
    return await this.calloutService.deleteCallout(deleteData.ID);
  }

  @Mutation(() => ICallout, {
    description: 'Update a Callout.',
  })
  async updateCallout(
    @CurrentActor() actorContext: ActorContext,
    @Args('calloutData') calloutData: UpdateCalloutEntityInput
  ): Promise<ICallout> {
    const callout = await this.calloutService.getCalloutOrFail(calloutData.ID);
    this.authorizationService.grantAccessOrFail(
      actorContext,
      callout.authorization,
      AuthorizationPrivilege.UPDATE,
      `update callout: ${callout.id}`
    );

    const updatedCallout = await this.calloutService.updateCallout(
      callout,
      calloutData,
      actorContext.actorId
    );

    // Reset authorization policy for the callout and its child entities
    // This is needed because updateCallout might create new entities (like comments room)
    // that need proper authorization policies
    const { roleSet, platformRolesAccess } =
      await this.roomResolverService.getRoleSetAndPlatformRolesWithAccessForCallout(
        updatedCallout.id
      );

    const updatedAuthorizations =
      await this.calloutAuthorizationService.applyAuthorizationPolicy(
        updatedCallout.id,
        updatedCallout.authorization,
        platformRolesAccess,
        roleSet
      );

    await this.authorizationPolicyService.saveAll(updatedAuthorizations);
    return updatedCallout;
  }

  @Mutation(() => ICallout, {
    description: 'Update the visibility of the specified Callout.',
  })
  async updateCalloutVisibility(
    @CurrentActor() actorContext: ActorContext,
    @Args('calloutData') calloutData: UpdateCalloutVisibilityInput
  ): Promise<ICallout> {
    const callout = await this.calloutService.getCalloutOrFail(
      calloutData.calloutID,
      {
        relations: {
          authorization: true,
          framing: true,
          calloutsSet: { authorization: true },
        },
      }
    );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      callout.authorization,
      AuthorizationPrivilege.UPDATE,
      `update visibility on callout: ${callout.id}`
    );

    const oldVisibility = callout.settings.visibility;
    const savedCallout =
      await this.calloutService.updateCalloutVisibility(calloutData);

    if (
      !savedCallout.isTemplate &&
      savedCallout.settings.visibility !== oldVisibility
    ) {
      if (savedCallout.settings.visibility === CalloutVisibility.PUBLISHED) {
        // Save published info
        await this.calloutService.updateCalloutPublishInfo(
          savedCallout,
          actorContext.actorId,
          Date.now()
        );

        if (callout.calloutsSet?.type === CalloutsSetType.COLLABORATION) {
          if (calloutData.sendNotification) {
            const notificationInput: NotificationInputCalloutPublished = {
              triggeredBy: actorContext.actorId,
              callout: callout,
            };
            void this.notificationAdapterSpace.spaceCollaborationCalloutPublished(
              notificationInput
            );
          }

          const activityLogInput: ActivityInputCalloutPublished = {
            triggeredBy: actorContext.actorId,
            callout: callout,
          };
          void this.activityAdapter.calloutPublished(activityLogInput);
        }
      }
    }

    // Reset authorization policy for the callout and its child entities
    // This is needed because when published as draft the authorization policy disallows access
    // for community members different than the creator
    const { roleSet, platformRolesAccess } =
      await this.roomResolverService.getRoleSetAndPlatformRolesWithAccessForCallout(
        savedCallout.id
      );

    const updatedAuthorizations =
      await this.calloutAuthorizationService.applyAuthorizationPolicy(
        savedCallout.id,
        callout.calloutsSet?.authorization,
        platformRolesAccess,
        roleSet
      );
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    //reload the callout to have all the relations updated
    return this.calloutService.getCalloutOrFail(savedCallout.id);
  }

  @Mutation(() => ICallout, {
    description:
      'Update the information describing the publishing of the specified Callout.',
  })
  async updateCalloutPublishInfo(
    @CurrentActor() actorContext: ActorContext,
    @Args('calloutData') calloutData: UpdateCalloutPublishInfoInput
  ): Promise<ICallout> {
    const callout = await this.calloutService.getCalloutOrFail(
      calloutData.calloutID
    );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      callout.authorization,
      AuthorizationPrivilege.UPDATE_CALLOUT_PUBLISHER,
      `update publisher information on callout: ${callout.id}`
    );
    return this.calloutService.updateCalloutPublishInfo(
      callout,
      calloutData.publisherID,
      calloutData.publishDate
    );
  }

  @Mutation(() => ICalloutContribution, {
    description: 'Create a new Contribution on the Callout.',
  })
  async createContributionOnCallout(
    @CurrentActor() actorContext: ActorContext,
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
      actorContext,
      callout.authorization,
      AuthorizationPrivilege.CONTRIBUTE,
      `create contribution on callout: ${callout.id}`
    );

    if (
      !callout.settings.contribution.enabled ||
      callout.settings.contribution.canAddContributions ===
        CalloutAllowedContributors.NONE
    ) {
      throw new CalloutClosedException(
        `New contributions to a closed Callout with id: '${callout.id}' are not allowed!`
      );
    }

    if (
      callout.settings.contribution.canAddContributions ===
      CalloutAllowedContributors.ADMINS
    ) {
      if (
        !this.authorizationService.isAccessGranted(
          actorContext,
          callout.authorization,
          AuthorizationPrivilege.UPDATE
        )
      ) {
        throw new CalloutClosedException(
          `Only admins are allowed to contribute to Callout with id: '${callout.id}'`
        );
      }
    }

    let contribution = await this.calloutService.createContributionOnCallout(
      contributionData,
      actorContext.actorId
    );

    const { roleSet, platformRolesAccess, spaceSettings } =
      await this.roomResolverService.getRoleSetAndPlatformRolesWithAccessForCallout(
        callout.id
      );

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
        platformRolesAccess,
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
      void this.postCreatedSubscription.publish(
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
        if (callout.settings.visibility === CalloutVisibility.PUBLISHED) {
          void this.processActivityPostCreated(
            callout,
            contribution,
            contribution.post,
            levelZeroSpaceID,
            actorContext
          );
        }
      }

      if (contributionData.link && contribution.link) {
        if (callout.settings.visibility === CalloutVisibility.PUBLISHED) {
          void this.processActivityLinkCreated(
            callout,
            contribution,
            contribution.link,
            levelZeroSpaceID,
            actorContext
          );
        }
      }

      if (contributionData.whiteboard && contribution.whiteboard) {
        if (callout.settings.visibility === CalloutVisibility.PUBLISHED) {
          void this.processActivityWhiteboardCreated(
            callout,
            contribution,
            contribution.whiteboard,
            levelZeroSpaceID,
            actorContext
          );
        }
      }

      if (contributionData.memo && contribution.memo) {
        if (callout.settings.visibility === CalloutVisibility.PUBLISHED) {
          void this.processActivityMemoCreated(
            callout,
            contribution,
            contribution.memo,
            levelZeroSpaceID,
            actorContext
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
    contribution: ICalloutContribution,
    link: ILink,
    levelZeroSpaceID: string,
    actorContext: ActorContext
  ) {
    const notificationInput: NotificationInputCollaborationCalloutContributionCreated =
      {
        contribution: contribution,
        callout: callout,
        contributionType: CalloutContributionType.LINK,
        triggeredBy: actorContext.actorId,
      };
    void this.notificationAdapterSpace.spaceCollaborationCalloutContributionCreated(
      notificationInput
    );
    const activityLogInput: ActivityInputCalloutLinkCreated = {
      triggeredBy: actorContext.actorId,
      link: link,
      callout: callout,
    };
    void this.activityAdapter.calloutLinkCreated(activityLogInput);

    this.contributionReporter.calloutLinkCreated(
      {
        id: link.id,
        name: link.profile.displayName,
        space: levelZeroSpaceID,
      },
      actorContext.actorId
    );
  }

  private async processActivityWhiteboardCreated(
    callout: ICallout,
    contribution: ICalloutContribution,
    whiteboard: IWhiteboard,
    levelZeroSpaceID: string,
    actorContext: ActorContext
  ) {
    const notificationInput: NotificationInputCollaborationCalloutContributionCreated =
      {
        contribution: contribution,
        callout: callout,
        contributionType: CalloutContributionType.WHITEBOARD,
        triggeredBy: actorContext.actorId,
      };
    void this.notificationAdapterSpace.spaceCollaborationCalloutContributionCreated(
      notificationInput
    );

    void this.activityAdapter.calloutWhiteboardCreated({
      triggeredBy: actorContext.actorId,
      whiteboard: whiteboard,
      callout: callout,
    });

    this.contributionReporter.calloutWhiteboardCreated(
      {
        id: whiteboard.id,
        name: whiteboard.nameID,
        space: levelZeroSpaceID,
      },
      actorContext.actorId
    );
  }

  private async processActivityPostCreated(
    callout: ICallout,
    contribution: ICalloutContribution,
    post: IPost,
    levelZeroSpaceID: string,
    actorContext: ActorContext
  ) {
    const notificationInput: NotificationInputCollaborationCalloutContributionCreated =
      {
        contribution: contribution,
        callout: callout,
        contributionType: CalloutContributionType.POST,
        triggeredBy: actorContext.actorId,
      };
    void this.notificationAdapterSpace.spaceCollaborationCalloutContributionCreated(
      notificationInput
    );

    const activityLogInput: ActivityInputCalloutPostCreated = {
      triggeredBy: actorContext.actorId,
      post: post,
      callout: callout,
    };
    void this.activityAdapter.calloutPostCreated(activityLogInput);

    this.contributionReporter.calloutPostCreated(
      {
        id: post.id,
        name: post.profile.displayName,
        space: levelZeroSpaceID,
      },
      actorContext.actorId
    );
  }

  private async processActivityMemoCreated(
    callout: ICallout,
    contribution: ICalloutContribution,
    memo: IMemo,
    levelZeroSpaceID: string,
    actorContext: ActorContext
  ) {
    const notificationInput: NotificationInputCollaborationCalloutContributionCreated =
      {
        contribution: contribution,
        callout: callout,
        contributionType: CalloutContributionType.MEMO,
        triggeredBy: actorContext.actorId,
      };
    void this.notificationAdapterSpace.spaceCollaborationCalloutContributionCreated(
      notificationInput
    );

    const activityLogInput: ActivityInputCalloutMemoCreated = {
      triggeredBy: actorContext.actorId,
      memo: memo,
      callout: callout,
    };
    void this.activityAdapter.calloutMemoCreated(activityLogInput);

    this.contributionReporter.calloutMemoCreated(
      {
        id: memo.id,
        name: memo.nameID,
        space: levelZeroSpaceID,
      },
      actorContext.actorId
    );
  }

  @Mutation(() => [ICalloutContribution], {
    description:
      'Update the sortOrder field of the Contributions of s Callout.',
  })
  async updateContributionsSortOrder(
    @CurrentActor() actorContext: ActorContext,
    @Args('sortOrderData')
    sortOrderData: UpdateContributionCalloutsSortOrderInput
  ): Promise<ICalloutContribution[]> {
    const callout = await this.calloutService.getCalloutOrFail(
      sortOrderData.calloutID
    );

    this.authorizationService.grantAccessOrFail(
      actorContext,
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
