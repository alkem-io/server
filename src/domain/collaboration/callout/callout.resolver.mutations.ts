import { SUBSCRIPTION_CALLOUT_POST_CREATED } from '@common/constants';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { ActorType } from '@common/enums/actor.type';
import { CalloutAllowedActors } from '@common/enums/callout.allowed.contributors';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { ReactionType } from '@common/enums/reaction.type';
import { SubscriptionType } from '@common/enums/subscription.type';
import {
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { CalloutClosedException } from '@common/exceptions/callout/callout.closed.exception';
import { streamToBuffer } from '@common/utils/file.util';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import {
  CalloutPostCreatedPayload,
  DeleteCalloutInput,
  UpdateCalloutEntityInput,
} from '@domain/collaboration/callout/dto';
import { CollaboraDocumentEventsService } from '@domain/collaboration/collabora-document/events/collabora.document.events.service';
import { IPost } from '@domain/collaboration/post/post.interface';
import { ReactionService } from '@domain/collaboration/reaction/reaction.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IMemo } from '@domain/common/memo/types';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { Inject } from '@nestjs/common/decorators';
import { ConfigService } from '@nestjs/config';
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
import { AlkemioConfig } from '@src/types/alkemio.config';
import { PubSubEngine } from 'graphql-subscriptions';
import { FileUpload, GraphQLUpload } from 'graphql-upload';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { ICalloutContribution } from '../callout-contribution/callout.contribution.interface';
import { CalloutContributionService } from '../callout-contribution/callout.contribution.service';
import { CalloutContributionAuthorizationService } from '../callout-contribution/callout.contribution.service.authorization';
import { UpdateContributionCalloutsSortOrderInput } from '../callout-contribution/dto/callout.contribution.dto.update.callouts.sort.order';
import { ICollaboraDocument } from '../collabora-document/collabora.document.interface';
import { ImportCollaboraDocumentInput } from '../collabora-document/dto/collabora.document.dto.import';
import { CollaborationLicenseService } from '../collaboration/collaboration.service.license';
import { ILink } from '../link/link.interface';
import { ICallout } from './callout.interface';
import { CalloutService } from './callout.service';
import { CalloutAuthorizationService } from './callout.service.authorization';
import { CreateContributionOnCalloutInput } from './dto/callout.dto.create.contribution';
import {
  AddReactionToCalloutInput,
  RemoveReactionFromCalloutInput,
} from './dto/callout.dto.reaction.input';
import { UpdateCalloutPublishInfoInput } from './dto/callout.dto.update.publish.info';
import { UpdateCalloutVisibilityInput } from './dto/callout.dto.update.visibility';

@InstrumentResolver()
@Resolver()
export class CalloutResolverMutations {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger,
    private readonly communityResolverService: CommunityResolverService,
    private readonly contributionReporter: ContributionReporterService,
    private readonly collaboraDocumentEventsService: CollaboraDocumentEventsService,
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
    private readonly configService: ConfigService<AlkemioConfig, true>,
    private readonly collaborationLicenseService: CollaborationLicenseService,
    private readonly whiteboardService: WhiteboardService,
    private readonly reactionService: ReactionService,
    private readonly actorLookupService: ActorLookupService,
    @Inject(SUBSCRIPTION_CALLOUT_POST_CREATED)
    private readonly postCreatedSubscription: PubSubEngine
  ) {}

  /**
   * A clone may read its source only after the actor is granted READ: when a
   * `sourceWhiteboardID` is present, load it with its authorization and
   * `grantAccessOrFail` READ (throws Forbidden). No-op when there is no source.
   */
  private async assertActorCanReadSourceWhiteboard(
    actorContext: ActorContext,
    sourceWhiteboardID?: string
  ): Promise<void> {
    if (!sourceWhiteboardID) {
      return;
    }
    const source = await this.whiteboardService.getWhiteboardOrFail(
      sourceWhiteboardID,
      { relations: { authorization: true } }
    );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      source.authorization,
      AuthorizationPrivilege.READ,
      `clone whiteboard content from source: ${sourceWhiteboardID}`
    );
  }

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
    const callout = await this.calloutService.getCalloutOrFail(calloutData.ID, {
      relations: {
        authorization: true,
        framing: true,
        calloutsSet: { authorization: true },
      },
    });
    this.authorizationService.grantAccessOrFail(
      actorContext,
      callout.authorization,
      AuthorizationPrivilege.UPDATE,
      `update callout: ${callout.id}`
    );

    // CONTRIBUTORS framing is admin-only and collaboration-only for LIVE callouts
    // (FR-004a/FR-004f, R5). Mirror the create guard on the update path so the
    // restriction can't be bypassed by converting an existing callout — or one
    // living in a non-COLLABORATION callouts set (e.g. a VC knowledge base) — to
    // CONTRIBUTORS via updateCallout, which otherwise only checks the generic
    // UPDATE privilege. The resulting type is the incoming framing type when
    // provided, else the stored one (so editing an existing CONTRIBUTORS callout
    // is gated too).
    //
    // Template callouts (callout.isTemplate) are EXEMPT: a standalone callout
    // template has no calloutsSet at all (calloutsSet is null), and template
    // callouts are governed by template-edit authorization (the UPDATE privilege
    // checked above), not the live-callout admin/collaboration rules. Without
    // this exemption, editing a CONTRIBUTORS callout template throws "only
    // available on COLLABORATION callouts sets" because its calloutsSet is null.
    const resultingFramingType =
      calloutData.framing?.type ?? callout.framing?.type;
    if (
      !callout.isTemplate &&
      resultingFramingType === CalloutFramingType.CONTRIBUTORS
    ) {
      if (callout.calloutsSet?.type !== CalloutsSetType.COLLABORATION) {
        throw new ValidationException(
          'CONTRIBUTORS framing is only available on COLLABORATION callouts sets.',
          LogContext.COLLABORATION
        );
      }
      this.authorizationService.grantAccessOrFail(
        actorContext,
        callout.calloutsSet.authorization,
        AuthorizationPrivilege.CREATE,
        `update CONTRIBUTORS callout (admin-only) on callouts Set: ${callout.calloutsSet.id}`
      );
    }

    // A CONTRIBUTORS callout TEMPLATE's framing may be edited (its contributor
    // settings — types, list/map) or removed (set to NONE), but MUST NOT be
    // switched to another framing type: templates only support keeping or
    // clearing the contributors framing.
    if (
      callout.isTemplate &&
      callout.framing?.type === CalloutFramingType.CONTRIBUTORS &&
      calloutData.framing?.type != null &&
      calloutData.framing.type !== CalloutFramingType.CONTRIBUTORS &&
      calloutData.framing.type !== CalloutFramingType.NONE
    ) {
      throw new ValidationException(
        'A CONTRIBUTORS callout template framing can only be kept or removed (set to NONE), not changed to another framing type.',
        LogContext.COLLABORATION
      );
    }

    const updatedCallout = await this.calloutService.updateCallout(
      callout,
      calloutData,
      actorContext.actorID
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
          actorContext.actorID,
          Date.now()
        );

        if (callout.calloutsSet?.type === CalloutsSetType.COLLABORATION) {
          if (calloutData.sendNotification) {
            const notificationInput: NotificationInputCalloutPublished = {
              triggeredBy: actorContext.actorID,
              callout: callout,
            };
            await this.notificationAdapterSpace.spaceCollaborationCalloutPublished(
              notificationInput
            );
          }

          const activityLogInput: ActivityInputCalloutPublished = {
            triggeredBy: actorContext.actorID,
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
        CalloutAllowedActors.NONE
    ) {
      throw new CalloutClosedException(
        'New contributions to this Callout are not allowed',
        LogContext.COLLABORATION,
        { calloutId: callout.id }
      );
    }

    if (
      callout.settings.contribution.canAddContributions ===
      CalloutAllowedActors.ADMINS
    ) {
      if (
        !this.authorizationService.isAccessGranted(
          actorContext,
          callout.authorization,
          AuthorizationPrivilege.UPDATE
        )
      ) {
        throw new CalloutClosedException(
          'Only admins are allowed to contribute to this Callout',
          LogContext.COLLABORATION,
          { calloutId: callout.id }
        );
      }
    }

    // Office Docs entitlement gate (FR-001/FR-004/FR-009): block contributions of type
    // Collabora Document when the owning Collaboration lacks SPACE_FLAG_OFFICE_DOCUMENTS.
    if (contributionData.type === CalloutContributionType.COLLABORA_DOCUMENT) {
      await this.collaborationLicenseService.ensureOfficeDocsAllowedForCallout(
        contributionData.calloutID
      );
    }

    // A clone (a WHITEBOARD contribution's `whiteboard.sourceWhiteboardID`) may read
    // its source only after the actor is granted READ.
    await this.assertActorCanReadSourceWhiteboard(
      actorContext,
      contributionData.type === CalloutContributionType.WHITEBOARD
        ? contributionData.whiteboard?.sourceWhiteboardID
        : undefined
    );

    let contribution = await this.calloutService.createContributionOnCallout(
      contributionData,
      actorContext.actorID
    );

    const { roleSet, platformRolesAccess, spaceSettings } =
      await this.roomResolverService.getRoleSetAndPlatformRolesWithAccessForCallout(
        callout.id
      );

    contribution = await this.calloutContributionService.save(contribution);

    // Phase-2 materialize: re-home cross-bucket markdown URLs / refs in
    // the contribution's leaf (LINK only — Post/Whiteboard/Memo are
    // self-materializing inside their createX). Failure rolls back the
    // just-saved contribution.
    await this.calloutContributionService.materializeCalloutContributionContent(
      contribution,
      contributionData,
      () => this.calloutContributionService.delete(contribution.id)
    );

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

      if (
        contributionData.collaboraDocument &&
        contribution.collaboraDocument
      ) {
        if (callout.settings.visibility === CalloutVisibility.PUBLISHED) {
          this.processActivityCollaboraDocumentCreated(
            callout,
            contribution,
            contribution.collaboraDocument,
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

  @Mutation(() => ICalloutContribution, {
    description:
      'Import an existing file as a CollaboraDocument contribution on the callout. file-service-go sniffs the MIME from content and rejects formats Collabora cannot edit.',
  })
  async importCollaboraDocument(
    @CurrentActor() actorContext: ActorContext,
    @Args('uploadData') uploadData: ImportCollaboraDocumentInput,
    @Args({ name: 'file', type: () => GraphQLUpload })
    { createReadStream, filename, mimetype }: FileUpload
  ): Promise<ICalloutContribution> {
    const callout = await this.calloutService.getCalloutOrFail(
      uploadData.calloutID
    );

    this.authorizationService.grantAccessOrFail(
      actorContext,
      callout.authorization,
      AuthorizationPrivilege.CONTRIBUTE,
      `import collabora document on callout: ${callout.id}`
    );

    if (
      !callout.settings.contribution.enabled ||
      callout.settings.contribution.canAddContributions ===
        CalloutAllowedActors.NONE
    ) {
      throw new CalloutClosedException(
        'New contributions to this Callout are not allowed',
        LogContext.COLLABORATION,
        { calloutId: callout.id }
      );
    }
    if (
      callout.settings.contribution.canAddContributions ===
        CalloutAllowedActors.ADMINS &&
      !this.authorizationService.isAccessGranted(
        actorContext,
        callout.authorization,
        AuthorizationPrivilege.UPDATE
      )
    ) {
      throw new CalloutClosedException(
        'Only admins are allowed to contribute to this Callout',
        LogContext.COLLABORATION,
        { calloutId: callout.id }
      );
    }

    // Office Docs entitlement gate (FR-001/FR-004/FR-009): the import path
    // introduces a Collabora Document into the target Callout's Collaboration.
    // Gate BEFORE buffering the upload so we fail fast on unlicensed targets.
    await this.collaborationLicenseService.ensureOfficeDocsAllowedForCallout(
      uploadData.calloutID
    );

    // Read the upload to a buffer with a configured timeout so a slow
    // or hung client can't pin Node's heap. Once direct-upload-with-
    // ticket lands this gets replaced with a fileId + fetch-metadata
    // call (no buffering on this side).
    const streamTimeoutMs = this.configService.get<number>(
      'storage.file.stream_timeout_ms',
      { infer: true }
    )!;
    const buffer = await streamToBuffer(createReadStream(), streamTimeoutMs);

    let contribution =
      await this.calloutService.importCollaboraDocumentToCallout(
        uploadData,
        { buffer, filename, mimetype },
        actorContext.actorID
      );

    const { roleSet, platformRolesAccess, spaceSettings } =
      await this.roomResolverService.getRoleSetAndPlatformRolesWithAccessForCallout(
        callout.id
      );

    contribution = await this.calloutContributionService.save(contribution);

    const updatedAuthorizations =
      await this.contributionAuthorizationService.applyAuthorizationPolicy(
        contribution.id,
        callout.authorization,
        platformRolesAccess,
        roleSet,
        spaceSettings
      );
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    if (contribution.collaboraDocument) {
      const collaboraDocument = contribution.collaboraDocument;
      this.collaboraDocumentEventsService.publishUploaded(
        collaboraDocument.id,
        collaboraDocument.profile?.displayName ?? collaboraDocument.id,
        actorContext
      );
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
        triggeredBy: actorContext.actorID,
      };
    await this.notificationAdapterSpace.spaceCollaborationCalloutContributionCreated(
      notificationInput
    );
    const activityLogInput: ActivityInputCalloutLinkCreated = {
      triggeredBy: actorContext.actorID,
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
      actorContext
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
        triggeredBy: actorContext.actorID,
      };
    await this.notificationAdapterSpace.spaceCollaborationCalloutContributionCreated(
      notificationInput
    );

    this.activityAdapter.calloutWhiteboardCreated({
      triggeredBy: actorContext.actorID,
      whiteboard: whiteboard,
      callout: callout,
    });

    this.contributionReporter.calloutWhiteboardCreated(
      {
        id: whiteboard.id,
        name: whiteboard.nameID,
        space: levelZeroSpaceID,
      },
      actorContext
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
        triggeredBy: actorContext.actorID,
      };
    await this.notificationAdapterSpace.spaceCollaborationCalloutContributionCreated(
      notificationInput
    );

    const activityLogInput: ActivityInputCalloutPostCreated = {
      triggeredBy: actorContext.actorID,
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
      actorContext
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
        triggeredBy: actorContext.actorID,
      };
    await this.notificationAdapterSpace.spaceCollaborationCalloutContributionCreated(
      notificationInput
    );

    const activityLogInput: ActivityInputCalloutMemoCreated = {
      triggeredBy: actorContext.actorID,
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
      actorContext
    );
  }

  private async processActivityCollaboraDocumentCreated(
    callout: ICallout,
    contribution: ICalloutContribution,
    collaboraDocument: ICollaboraDocument,
    levelZeroSpaceID: string,
    actorContext: ActorContext
  ) {
    const notificationInput: NotificationInputCollaborationCalloutContributionCreated =
      {
        contribution: contribution,
        callout: callout,
        contributionType: CalloutContributionType.COLLABORA_DOCUMENT,
        triggeredBy: actorContext.actorID,
      };
    await this.notificationAdapterSpace.spaceCollaborationCalloutContributionCreated(
      notificationInput
    );

    this.contributionReporter.calloutCollaboraDocumentCreated(
      {
        id: collaboraDocument.id,
        name: collaboraDocument.profile?.displayName ?? collaboraDocument.id,
        space: levelZeroSpaceID,
      },
      actorContext
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

  @Mutation(() => ICallout, {
    description:
      "Adds or swaps the requesting user's single reaction on a Callout. Requires CONTRIBUTE on the Callout. The Callout must be published and not a template. The emoji must be on the platform allow-list.",
  })
  async addReactionToCallout(
    @CurrentActor() actorContext: ActorContext,
    @Args('reactionData') reactionData: AddReactionToCalloutInput
  ): Promise<ICallout> {
    const callout = await this.calloutService.getCalloutOrFail(
      reactionData.calloutID,
      { relations: { authorization: true } }
    );

    this.authorizationService.grantAccessOrFail(
      actorContext,
      callout.authorization,
      AuthorizationPrivilege.CONTRIBUTE,
      `react to callout: ${callout.id}`
    );

    // Anonymous actors have no actorID and cannot react.
    if (!actorContext.actorID) {
      throw new ValidationException(
        'Authentication is required to react to a Callout',
        LogContext.COLLABORATION,
        { calloutId: callout.id }
      );
    }

    // Human users only. Reaction.createdBy is an FK to user(id), so a
    // non-user actor (e.g. a Virtual Contributor) would violate the FK and
    // mis-attribute the reaction — reject it before writing.
    const actorType = await this.actorLookupService.getActorTypeByIdOrFail(
      actorContext.actorID
    );
    if (actorType !== ActorType.USER) {
      throw new ValidationException(
        'Only human users can react to a Callout',
        LogContext.COLLABORATION,
        { calloutId: callout.id, actorType }
      );
    }

    // Only published, non-template callouts accept reactions.
    if (callout.settings.visibility !== CalloutVisibility.PUBLISHED) {
      throw new ValidationException(
        'Reactions are only allowed on published Callouts',
        LogContext.COLLABORATION,
        { calloutId: callout.id, visibility: callout.settings.visibility }
      );
    }
    if (callout.isTemplate) {
      throw new ValidationException(
        'Reactions are not allowed on template Callouts',
        LogContext.COLLABORATION,
        { calloutId: callout.id }
      );
    }

    this.reactionService.validateAllowedEmojiOrFail(reactionData.emoji);

    await this.reactionService.upsertReaction(
      ReactionType.POST,
      callout.id,
      actorContext.actorID,
      reactionData.emoji
    );

    return this.calloutService.getCalloutOrFail(reactionData.calloutID);
  }

  @Mutation(() => ICallout, {
    description:
      "Removes the requesting user's reaction from a Callout. Idempotent — no error when no reaction exists. Self-scoped; requires only authentication (not CONTRIBUTE). Returns the Callout only when the caller retains READ access on it.",
  })
  async removeReactionFromCallout(
    @CurrentActor() actorContext: ActorContext,
    @Args('reactionData') reactionData: RemoveReactionFromCalloutInput
  ): Promise<ICallout> {
    // Only authentication is required — removal does not need CONTRIBUTE.
    if (!actorContext.actorID) {
      throw new ValidationException(
        'Authentication is required to remove a reaction from a Callout',
        LogContext.COLLABORATION,
        { calloutId: reactionData.calloutID }
      );
    }

    // Fetch with authorization relation so the READ check below can proceed.
    const callout = await this.calloutService.getCalloutOrFail(
      reactionData.calloutID,
      { relations: { authorization: true } }
    );

    // Human users only. Reaction.createdBy is an FK to user(id); a non-user
    // actor (e.g. a Virtual Contributor) can never own a reaction, so reject
    // it rather than issue a delete keyed on a non-user id.
    const actorType = await this.actorLookupService.getActorTypeByIdOrFail(
      actorContext.actorID
    );
    if (actorType !== ActorType.USER) {
      throw new ValidationException(
        'Only human users can react to a Callout',
        LogContext.COLLABORATION,
        { calloutId: callout.id, actorType }
      );
    }

    // Idempotent: removal is a no-op if no reaction exists.
    await this.reactionService.removeReaction(
      ReactionType.POST,
      callout.id,
      actorContext.actorID
    );

    // Verify the caller can read the callout before disclosing any of its
    // fields. This prevents the mutation from acting as an IDOR oracle —
    // a caller who has already lost space membership cannot use it to read
    // callout metadata across space boundaries.
    this.authorizationService.grantAccessOrFail(
      actorContext,
      callout.authorization,
      AuthorizationPrivilege.READ,
      `read callout after reaction removal: ${callout.id}`
    );

    return callout;
  }
}
