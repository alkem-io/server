import { SUBSCRIPTION_CALLOUT_POST_CREATED } from '@common/constants';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { CalloutAllowedContributors } from '@common/enums/callout.allowed.contributors';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { SubscriptionType } from '@common/enums/subscription.type';
import { RelationshipNotFoundException } from '@common/exceptions';
import { CalloutClosedException } from '@common/exceptions/callout/callout.closed.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import {
  CalloutPostCreatedPayload,
  DeleteCalloutInput,
  UpdateCalloutEntityInput,
} from '@domain/collaboration/callout/dto';
import { IPost } from '@domain/collaboration/post/post.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IMemo } from '@domain/common/memo/types';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { Inject } from '@nestjs/common/decorators';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { ActivityInputCalloutLinkCreated } from '@services/adapters/activity-adapter/dto/activity.dto.input.callout.link.created';
import { ActivityInputCalloutMemoCreated } from '@services/adapters/activity-adapter/dto/activity.dto.input.callout.memo.created';
import { ActivityInputCalloutPostCreated } from '@services/adapters/activity-adapter/dto/activity.dto.input.callout.post.created';
import { ActivityInputCalloutPublished } from '@services/adapters/activity-adapter/dto/activity.dto.input.callout.published';
import { NotificationInputCollaborationCalloutContributionCreated } from '@services/adapters/notification-adapter/dto/space/notification.dto.input.space.collaboration.callout.contribution.created';
import { NotificationInputCalloutPublished } from '@services/adapters/notification-adapter/dto/space/notification.dto.input.space.collaboration.callout.published';
import { NotificationSpaceAdapter } from '@services/adapters/notification-adapter/notification.space.adapter';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { RoomResolverService } from '@services/infrastructure/entity-resolver/room.resolver.service';
import { TemporaryStorageService } from '@services/infrastructure/temporary-storage/temporary.storage.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { PubSubEngine } from 'graphql-subscriptions';
import { ICalloutContribution } from '../callout-contribution/callout.contribution.interface';
import { CalloutContributionService } from '../callout-contribution/callout.contribution.service';
import { CalloutContributionAuthorizationService } from '../callout-contribution/callout.contribution.service.authorization';
import { UpdateContributionCalloutsSortOrderInput } from '../callout-contribution/dto/callout.contribution.dto.update.callouts.sort.order';
import { ILink } from '../link/link.interface';
import { ICallout } from './callout.interface';
import { CalloutService } from './callout.service';
import { CalloutAuthorizationService } from './callout.service.authorization';
import { CreateContributionOnCalloutInput } from './dto/callout.dto.create.contribution';
import { UpdateCalloutPublishInfoInput } from './dto/callout.dto.update.publish.info';
import { UpdateCalloutVisibilityInput } from './dto/callout.dto.update.visibility';

@InstrumentResolver()
@Resolver()
export class CalloutResolverMutations {
  constructor(
    private readonly communityResolverService: CommunityResolverService,
    private readonly contributionReporter: ContributionReporterService,
    private readonly activityAdapter: ActivityAdapter,
    private readonly notificationAdapterSpace: NotificationSpaceAdapter,
    private readonly authorizationService: AuthorizationService,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    private readonly calloutService: CalloutService,
    private readonly calloutAuthorizationService: CalloutAuthorizationService,
    private readonly roomResolverService: RoomResolverService,
    private readonly contributionAuthorizationService: CalloutContributionAuthorizationService,
    private readonly calloutContributionService: CalloutContributionService,
    private readonly temporaryStorageService: TemporaryStorageService,
    @Inject(SUBSCRIPTION_CALLOUT_POST_CREATED)
    private readonly postCreatedSubscription: PubSubEngine
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
            await this.notificationAdapterSpace.spaceCollaborationCalloutPublished(
              notificationInput
            );
          }

          const activityLogInput: ActivityInputCalloutPublished = {
            triggeredBy: actorContext.actorId,
            callout: callout,
          };
          this.activityAdapter.calloutPublished(activityLogInput);
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
        if (callout.settings.visibility === CalloutVisibility.PUBLISHED) {
          this.processActivityPostCreated(
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
          this.processActivityLinkCreated(
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
          this.processActivityWhiteboardCreated(
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
          this.processActivityMemoCreated(
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
    await this.notificationAdapterSpace.spaceCollaborationCalloutContributionCreated(
      notificationInput
    );
    const activityLogInput: ActivityInputCalloutLinkCreated = {
      triggeredBy: actorContext.actorId,
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
        id: actorContext.actorId,
        email: actorContext.actorId,
      }
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
    await this.notificationAdapterSpace.spaceCollaborationCalloutContributionCreated(
      notificationInput
    );

    this.activityAdapter.calloutWhiteboardCreated({
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
      {
        id: actorContext.actorId,
        email: actorContext.actorId,
      }
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
    await this.notificationAdapterSpace.spaceCollaborationCalloutContributionCreated(
      notificationInput
    );

    const activityLogInput: ActivityInputCalloutPostCreated = {
      triggeredBy: actorContext.actorId,
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
        id: actorContext.actorId,
        email: actorContext.actorId,
      }
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
    await this.notificationAdapterSpace.spaceCollaborationCalloutContributionCreated(
      notificationInput
    );

    const activityLogInput: ActivityInputCalloutMemoCreated = {
      triggeredBy: actorContext.actorId,
      memo: memo,
      callout: callout,
    };
    this.activityAdapter.calloutMemoCreated(activityLogInput);

    this.contributionReporter.calloutMemoCreated(
      {
        id: memo.id,
        name: memo.nameID,
        space: levelZeroSpaceID,
      },
      {
        id: actorContext.actorId,
        email: actorContext.actorId,
      }
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
