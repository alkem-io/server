import { LogContext } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import {
  AllCalloutContributionTypes,
  CalloutContributionType,
} from '@common/enums/callout.contribution.type';
import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { CalloutSelectionMode } from '@common/enums/callout.selection.mode';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { RoleName } from '@common/enums/role.name';
import { RoomType } from '@common/enums/room.type';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { limitAndShuffle } from '@common/utils';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { CreateCalloutInput } from '@domain/collaboration/callout/dto/index';
import { CreateCalloutContributionInput } from '@domain/collaboration/callout-contribution/dto/callout.contribution.dto.create';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IClassification } from '@domain/common/classification/classification.interface';
import { ClassificationService } from '@domain/common/classification/classification.service';
import { CreateMemoInput } from '@domain/common/memo/dto/memo.dto.create';
import { ITagsetTemplate } from '@domain/common/tagset-template';
import { CreateWhiteboardInput } from '@domain/common/whiteboard/dto/whiteboard.dto.create';
import { IRoom } from '@domain/communication/room/room.interface';
import { RoomService } from '@domain/communication/room/room.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Space } from '@domain/space/space/space.entity';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { cloneDeep, keyBy, merge, mergeWith } from 'lodash';
import {
  DeepPartial,
  FindManyOptions,
  FindOneOptions,
  Repository,
} from 'typeorm';
import { CalloutContribution } from '../callout-contribution/callout.contribution.entity';
import { ICalloutContribution } from '../callout-contribution/callout.contribution.interface';
import { CalloutContributionService } from '../callout-contribution/callout.contribution.service';
import { UpdateContributionCalloutsSortOrderInput } from '../callout-contribution/dto/callout.contribution.dto.update.callouts.sort.order';
import { ICalloutContributionDefaults } from '../callout-contribution-defaults/callout.contribution.defaults.interface';
import { CalloutContributionDefaultsService } from '../callout-contribution-defaults/callout.contribution.defaults.service';
import { ICalloutFraming } from '../callout-framing/callout.framing.interface';
import { CalloutFramingService } from '../callout-framing/callout.framing.service';
import { DefaultCalloutSettings } from '../callout-settings/callout.settings.default';
import { ICalloutSettings } from '../callout-settings/callout.settings.interface';
import { CollaboraDocumentService } from '../collabora-document/collabora.document.service';
import { ImportCollaboraDocumentInput } from '../collabora-document/dto/collabora.document.dto.import';
import { CreatePostInput } from '../post/dto/post.dto.create';
import { CalloutContributionsCountOutput } from './dto/callout.contributions.count.dto';
import { CreateContributionOnCalloutInput } from './dto/callout.dto.create.contribution';
import { UpdateCalloutInput } from './dto/callout.dto.update';
import { UpdateCalloutVisibilityInput } from './dto/callout.dto.update.visibility';

@Injectable()
export class CalloutService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private namingService: NamingService,
    private roomService: RoomService,
    private userLookupService: UserLookupService,
    private calloutFramingService: CalloutFramingService,
    private contributionDefaultsService: CalloutContributionDefaultsService,
    private contributionService: CalloutContributionService,
    private collaboraDocumentService: CollaboraDocumentService,
    private storageAggregatorResolverService: StorageAggregatorResolverService,
    private classificationService: ClassificationService,
    private roleSetService: RoleSetService,
    @InjectRepository(Callout)
    private calloutRepository: Repository<Callout>
  ) {}

  public async createCallout(
    calloutData: CreateCalloutInput,
    classificationTagsetTemplates: ITagsetTemplate[],
    storageAggregator: IStorageAggregator,
    userID?: string,
    parentSpaceId?: string
  ): Promise<ICallout> {
    this.validateCreateCalloutData(calloutData);

    if (!calloutData.sortOrder) {
      calloutData.sortOrder = 10;
    }

    const callout: ICallout = Callout.create(
      calloutData as DeepPartial<Callout>
    );
    callout.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.CALLOUT
    );
    callout.createdBy = userID;
    callout.contributions = [];

    callout.framing = await this.calloutFramingService.createCalloutFraming(
      calloutData.framing,
      storageAggregator,
      userID
    );

    callout.settings = this.createCalloutSettings(calloutData.settings);

    // Validate + auto-heal the contributors framing settings against the
    // framing type (present iff CONTRIBUTORS; defaultContributorType/defaultView
    // normalization). FR-004b/FR-006a/FR-006b/FR-006c.
    callout.settings.framing =
      this.calloutFramingService.validateAndNormalizeContributorsSettings(
        callout.framing.type,
        callout.settings.framing
      );

    // Validate + normalize selection settings (workspace#025, FR-013/FR-022).
    // Runs after contributors normalization so the framing type is stable.
    callout.settings.framing =
      this.calloutFramingService.validateAndNormalizeSelectionSettings(
        callout.framing.type,
        callout.settings.framing,
        calloutData.settings?.framing?.selection
      );

    // AC3 host-scope guard: reject any selectedId not in the host's RoleSet
    // (contributors) or not a direct subspace of the host (spaces). Only runs
    // when the normalized selection is CUSTOM + non-empty (FR-006).
    await this.validateSelectionScopeGuard(
      callout.framing.type,
      callout.settings.framing.selection,
      parentSpaceId
    );

    if (callout.settings.visibility === CalloutVisibility.PUBLISHED) {
      callout.publishedDate = new Date();
      callout.publishedBy = userID;
    }

    callout.classification = this.classificationService.createClassification(
      classificationTagsetTemplates,
      calloutData.classification
    );

    callout.contributionDefaults =
      this.contributionDefaultsService.createCalloutContributionDefaults(
        calloutData.contributionDefaults
      );

    if (userID && calloutData.contributions && callout.settings.contribution) {
      callout.contributions =
        await this.contributionService.createCalloutContributions(
          calloutData.contributions,
          storageAggregator,
          callout.settings.contribution,
          userID,
          parentSpaceId
        );
    }

    if (!callout.isTemplate && callout.settings.framing.commentsEnabled) {
      callout.comments = await this.roomService.createRoom({
        displayName: `callout-comments-${callout.nameID}`,
        type: RoomType.CALLOUT,
        parentContextId: parentSpaceId,
      });
    }

    return callout;
  }

  /**
   * Phase-2 materialization for a Callout. Composed under a parent
   * (collaboration, template, knowledge-base); the parent's save persists
   * the callout's framing/contribution buckets before this is called.
   *
   * Walks framing + each contribution. Failures bubble up via the supplied
   * rollback callback (cleans up the top-level parent — cascade clears the
   * rest).
   *
   * Both `framing` and `contributions` MUST be loaded on the input
   * Callout. Silent skip would leave the entity persisted with
   * unmaterialized children — phase-2 looks successful while content
   * stays in the source bucket. We distinguish "not loaded" (undefined)
   * from "loaded but empty" ([]) for the contributions relation.
   */
  public async materializeCalloutContent(
    callout: ICallout,
    calloutData: CreateCalloutInput | undefined,
    rollback: () => Promise<unknown>
  ): Promise<void> {
    if (!callout.framing) {
      throw new RelationshipNotFoundException(
        'Missing required relation for phase-2 materialization',
        LogContext.COLLABORATION,
        { calloutId: callout.id, missing: ['framing'] }
      );
    }
    if (callout.contributions === undefined) {
      throw new RelationshipNotFoundException(
        'Missing required relation for phase-2 materialization',
        LogContext.COLLABORATION,
        { calloutId: callout.id, missing: ['contributions'] }
      );
    }
    await this.calloutFramingService.materializeCalloutFramingContent(
      callout.framing,
      calloutData?.framing,
      rollback
    );
    // contributionDefaults.postDescription may carry markdown URLs that
    // reference documents in another bucket (template clone) or in a
    // temporary location (just-uploaded image). Re-home them now that
    // the framing's storageBucket has a real id from the cascade save.
    //
    // contributionDefaults is always populated by createCallout (the
    // entity is initialized with default `postDescription = ''`) and
    // framing.profile.storageBucket is always loaded by the time
    // materializeCalloutContent runs (we just materialized framing two
    // lines above). A missing relation here means a partial load —
    // fail fast rather than silently leaving postDescription URLs
    // unresolved.
    if (!callout.contributionDefaults) {
      throw new RelationshipNotFoundException(
        'Missing required relation for phase-2 materialization',
        LogContext.COLLABORATION,
        { calloutId: callout.id, missing: ['contributionDefaults'] }
      );
    }
    if (!callout.framing.profile?.storageBucket) {
      throw new RelationshipNotFoundException(
        'Missing required relation for phase-2 materialization',
        LogContext.COLLABORATION,
        {
          calloutId: callout.id,
          missing: ['framing.profile.storageBucket'],
        }
      );
    }
    await this.contributionDefaultsService.materializeCalloutContributionDefaultsContent(
      callout.contributionDefaults,
      callout.framing.profile.storageBucket,
      rollback
    );
    // Pair persisted contributions to their input data by `type` + the
    // nested entity's stable identifier (Link.uri for LINK, nameID for
    // POST/WHITEBOARD/MEMO). Index-based pairing would silently misalign
    // when the persisted relation order differs from the input order,
    // attaching the wrong visuals to the wrong contribution. We consume
    // matched inputs from a working list so duplicate-keyed inputs (same
    // link.uri twice) pair one-to-one rather than collapsing.
    const remainingInputs = [...(calloutData?.contributions ?? [])];
    for (const contribution of callout.contributions) {
      const matchIdx = remainingInputs.findIndex(input =>
        this.isSameContribution(input, contribution)
      );
      const inputForContrib =
        matchIdx >= 0 ? remainingInputs.splice(matchIdx, 1)[0] : undefined;
      await this.contributionService.materializeCalloutContributionContent(
        contribution,
        inputForContrib,
        rollback
      );
    }
  }

  private isSameContribution(
    input: CreateCalloutContributionInput,
    contribution: ICalloutContribution
  ): boolean {
    if (input.type !== contribution.type) return false;
    switch (contribution.type) {
      case CalloutContributionType.LINK:
        return (
          !!input.link?.uri &&
          !!contribution.link?.uri &&
          input.link.uri === contribution.link.uri
        );
      case CalloutContributionType.POST:
        return (
          !!input.post?.nameID &&
          !!contribution.post?.nameID &&
          input.post.nameID === contribution.post.nameID
        );
      case CalloutContributionType.WHITEBOARD:
        return (
          !!input.whiteboard?.nameID &&
          !!contribution.whiteboard?.nameID &&
          input.whiteboard.nameID === contribution.whiteboard.nameID
        );
      case CalloutContributionType.MEMO:
        return (
          !!input.memo?.nameID &&
          !!contribution.memo?.nameID &&
          input.memo.nameID === contribution.memo.nameID
        );
      // COLLABORA_DOCUMENT contributions are created via the dedicated
      // importCollaboraDocument mutation — they never appear in a bulk
      // CreateCalloutContributionInput payload, so phase-2 pairing has
      // nothing to match against. Falling through to default is correct.
      default:
        return false;
    }
  }

  private createCalloutSettings(
    settingsData?: CreateCalloutInput['settings']
  ): ICalloutSettings {
    const calloutSettings = cloneDeep(DefaultCalloutSettings);
    if (settingsData) {
      merge(calloutSettings, settingsData);
    }
    return calloutSettings;
  }

  private validateCreateCalloutData(calloutData: CreateCalloutInput) {
    if (
      // If can contribute with whiteboard
      (calloutData.settings?.contribution?.allowedTypes ?? []).includes(
        CalloutContributionType.WHITEBOARD
      ) && //  but no whiteboard template provided
      !calloutData.contributionDefaults?.whiteboardContent
    ) {
      throw new ValidationException(
        'Please provide a whiteboard template',
        LogContext.COLLABORATION
      );
    }

    if (
      calloutData.framing.type == CalloutFramingType.WHITEBOARD &&
      !calloutData.framing.whiteboard
    ) {
      throw new ValidationException(
        'Please provide a whiteboard',
        LogContext.COLLABORATION
      );
    } else if (
      calloutData.framing.type !== CalloutFramingType.WHITEBOARD &&
      calloutData.framing.whiteboard
    ) {
      throw new ValidationException(
        'Whiteboard framing can only be used with whiteboard framing type',
        LogContext.COLLABORATION
      );
    }

    if (
      calloutData.framing.type === CalloutFramingType.POLL &&
      !calloutData.framing.poll
    ) {
      throw new ValidationException(
        'Please provide a poll',
        LogContext.COLLABORATION
      );
    } else if (
      calloutData.framing.type !== CalloutFramingType.POLL &&
      calloutData.framing.poll
    ) {
      throw new ValidationException(
        'Poll framing can only be used with poll framing type',
        LogContext.COLLABORATION
      );
    }
  }

  private async getStorageAggregator(
    calloutID: string
  ): Promise<IStorageAggregator> {
    return await this.storageAggregatorResolverService.getStorageAggregatorForCallout(
      calloutID
    );
  }

  public async getCalloutOrFail(
    calloutID: string,
    options?: FindOneOptions<Callout>
  ): Promise<ICallout | never> {
    const callout = await this.calloutRepository.findOne({
      where: { id: calloutID },
      ...options,
    });

    if (!callout)
      throw new EntityNotFoundException(
        'Callout not found',
        LogContext.COLLABORATION,
        { calloutID, options }
      );
    return callout;
  }

  public async updateCalloutVisibility(
    calloutVisibilityUpdateData: UpdateCalloutVisibilityInput
  ): Promise<ICallout> {
    const callout = await this.getCalloutOrFail(
      calloutVisibilityUpdateData.calloutID
    );

    if (calloutVisibilityUpdateData.visibility)
      callout.settings.visibility = calloutVisibilityUpdateData.visibility;

    return await this.calloutRepository.save(callout);
  }

  public async updateCalloutPublishInfo(
    callout: ICallout,
    publisherID?: string,
    publishedTimestamp?: number
  ): Promise<ICallout> {
    if (publisherID) {
      const publisher = await this.userLookupService.getUserById(publisherID);
      callout.publishedBy = publisher?.id || '';
    }

    if (publishedTimestamp) {
      const date = new Date(publishedTimestamp);
      callout.publishedDate = date;
    }

    return await this.calloutRepository.save(callout);
  }

  public async updateCallout(
    calloutInput: ICallout,
    calloutUpdateData: UpdateCalloutInput,
    userID?: string
  ): Promise<ICallout> {
    const callout = await this.getCalloutOrFail(calloutInput.id, {
      relations: {
        contributionDefaults: true,
        framing: {
          profile: true,
          whiteboard: true,
          link: true,
          memo: true,
          mediaGallery: true,
          poll: true,
          collaboraDocument: true,
        },
        classification: {
          tagsets: true,
        },
        calloutsSet: true,
      },
    });
    const storageAggregator = await this.getStorageAggregator(callout.id);

    if (!callout.contributionDefaults || !callout.settings.contribution) {
      throw new EntityNotInitializedException(
        `Unable to load callout: ${callout.id}`,
        LogContext.COLLABORATION
      );
    }

    if (calloutUpdateData.framing) {
      callout.framing = await this.calloutFramingService.updateCalloutFraming(
        callout.framing,
        calloutUpdateData.framing,
        storageAggregator,
        callout.isTemplate,
        userID
      );
    }

    if (calloutUpdateData.settings) {
      // Replace arrays wholesale instead of deep-merging them element-by-index:
      // a default `merge` keeps the longer stored array's tail, so EXCLUDING a
      // contributor type (sending a shorter `contributorTypes`) would silently
      // not persist. Arrays in settings are config lists, not positional patches.
      callout.settings = mergeWith(
        callout.settings,
        calloutUpdateData.settings,
        (_existing, incoming) =>
          Array.isArray(incoming) ? incoming : undefined
      );
    }

    // When the framing type is (or was just changed to) anything other than
    // CONTRIBUTORS, a previously-stored contributors block must not linger:
    // merge/mergeWith never delete keys, and the client clears framing by
    // sending the new type without a `contributors` field, so the stale block
    // would survive the merge. validateAndNormalizeContributorsSettings then
    // throws on a non-CONTRIBUTORS framing that still carries contributors,
    // permanently blocking the update (the callout gets stuck as CONTRIBUTORS).
    // Strip it first so the type change — and any later edit — succeeds.
    if (
      callout.framing.type !== CalloutFramingType.CONTRIBUTORS &&
      callout.settings.framing.contributors
    ) {
      delete callout.settings.framing.contributors;
    }

    // Re-validate + auto-heal contributors settings after any framing-type or
    // settings change (FR-004b/FR-006a/FR-006b/FR-006c). Runs even when only
    // the framing type changed so a stale contributors block is rejected and a
    // type/view that became invalid is healed.
    callout.settings.framing =
      this.calloutFramingService.validateAndNormalizeContributorsSettings(
        callout.framing.type,
        callout.settings.framing
      );

    // Re-validate + normalize selection settings (workspace#025, FR-013/FR-022).
    // Strip stale selection on framing-type change (non-collection type change)
    // and apply partial-update semantics for the new value.
    if (
      callout.framing.type !== CalloutFramingType.CONTRIBUTORS &&
      callout.framing.type !== CalloutFramingType.SPACES &&
      callout.settings.framing.selection
    ) {
      delete callout.settings.framing.selection;
    }
    callout.settings.framing =
      this.calloutFramingService.validateAndNormalizeSelectionSettings(
        callout.framing.type,
        callout.settings.framing,
        calloutUpdateData.settings?.framing?.selection
      );

    // AC3 host-scope guard on update: only validate ids the caller explicitly
    // submitted in this request (FR-008: stale stored ids must be inert — no
    // admin action required to remove a since-departed member/subspace).
    // The guard still runs in full on the CREATE path (line ~135) where there
    // are no pre-existing stored ids.
    if (
      calloutUpdateData.settings?.framing?.selection?.selectedIds !== undefined
    ) {
      const updateParentSpaceId = callout.calloutsSet
        ? await this.getParentSpaceId(callout.calloutsSet.id)
        : undefined;
      await this.validateSelectionScopeGuard(
        callout.framing.type,
        callout.settings.framing.selection,
        updateParentSpaceId
      );
    }

    if (calloutUpdateData.classification) {
      callout.classification = this.classificationService.updateClassification(
        callout.classification,
        calloutUpdateData.classification
      );
    }

    if (calloutUpdateData.contributionDefaults) {
      callout.contributionDefaults =
        this.contributionDefaultsService.updateCalloutContributionDefaults(
          callout.contributionDefaults,
          calloutUpdateData.contributionDefaults
        );
    }

    // Create the Matrix room for comments if it doesn't yet exist
    if (
      !callout.isTemplate &&
      callout.settings.framing.commentsEnabled &&
      !callout.comments
    ) {
      const parentSpaceId = callout.calloutsSet
        ? await this.getParentSpaceId(callout.calloutsSet.id)
        : undefined;
      callout.comments = await this.roomService.createRoom({
        displayName: `callout-comments-${callout.nameID}`,
        type: RoomType.CALLOUT,
        parentContextId: parentSpaceId,
      });
    }

    if (calloutUpdateData.sortOrder)
      callout.sortOrder = calloutUpdateData.sortOrder;

    return await this.calloutRepository.save(callout);
  }

  async save(callout: ICallout): Promise<ICallout> {
    return await this.calloutRepository.save(callout);
  }

  public async deleteCallout(calloutID: string): Promise<ICallout> {
    const callout = await this.getCalloutOrFail(calloutID, {
      relations: {
        comments: true,
        contributions: true,
        contributionDefaults: true,
        framing: true,
      },
    });

    if (
      !callout.contributionDefaults ||
      !callout.settings ||
      !callout.contributions
    ) {
      throw new EntityNotInitializedException(
        `Unable to load callout for deleting: ${callout.id}`,
        LogContext.COLLABORATION
      );
    }

    await this.calloutFramingService.delete(callout.framing);

    for (const contribution of callout.contributions) {
      await this.contributionService.delete(contribution.id);
    }

    if (callout.comments) {
      await this.roomService.deleteRoom({
        roomID: callout.comments.id,
      });
    }

    await this.contributionDefaultsService.delete(callout.contributionDefaults);

    if (callout.authorization)
      await this.authorizationPolicyService.delete(callout.authorization);

    const result = await this.calloutRepository.remove(callout as Callout);
    result.id = calloutID;

    return result;
  }

  public getCallouts(options: FindManyOptions<Callout>): Promise<ICallout[]> {
    return this.calloutRepository.find(options);
  }

  /**
   *
   * @param callout
   * @returns a number, the number of messages or the number of contributions if the callout allows contributions
   */
  public async getActivityCount(callout: ICallout): Promise<number> {
    if (callout.settings.contribution.allowedTypes.length > 0) {
      return this.contributionService.getContributionsInCalloutCount(
        callout.id
      );
    } else {
      return this.getCommentsCount(callout.id);
    }
  }

  /**
   * Batch-computes activity counts for multiple callouts, setting the `activity`
   * property on each callout in-place. Contribution-type callouts are batched
   * into a single DB query; comment-type callouts use the already eagerly-loaded
   * `comments` relation and parallelize the RPC calls.
   */
  public async getActivityCountBatch(callouts: ICallout[]): Promise<void> {
    const contributionCallouts = callouts.filter(
      c => c.settings.contribution.allowedTypes.length > 0
    );
    const commentCallouts = callouts.filter(
      c => c.settings.contribution.allowedTypes.length === 0
    );

    // Batch contribution counts in a single query
    if (contributionCallouts.length > 0) {
      const contributionCounts =
        await this.contributionService.getContributionsCountBatch(
          contributionCallouts.map(c => c.id)
        );
      for (const callout of contributionCallouts) {
        callout.activity = contributionCounts.get(callout.id) ?? 0;
      }
    }

    // Comment-type callouts: use already eagerly-loaded comments, parallelize RPC calls
    if (commentCallouts.length > 0) {
      const commentCounts = await Promise.all(
        commentCallouts.map(async callout => {
          // comments is an eager relation, so it's already loaded on the callout
          if (!callout.comments) return 0;
          const messages = await this.roomService.getMessages(callout.comments);
          return messages.length;
        })
      );
      for (let i = 0; i < commentCallouts.length; i++) {
        commentCallouts[i].activity = commentCounts[i];
      }
    }
  }

  private async setNameIdOnPostData(
    postData: CreatePostInput,
    reservedNameIDs: string[],
    callout: ICallout
  ) {
    if (postData.nameID && postData.nameID.length > 0) {
      const nameTaken = reservedNameIDs.includes(postData.nameID);
      if (nameTaken)
        throw new ValidationException(
          `Unable to create Post: the provided nameID is already taken: ${postData.nameID}`,
          LogContext.SPACES
        );
    } else {
      postData.nameID = this.namingService.createNameIdAvoidingReservedNameIDs(
        postData.profileData.displayName,
        reservedNameIDs
      );
    }

    // Check that there isn't an post with the same title
    const displayName = postData.profileData.displayName;
    const existingPost = callout.posts?.find(
      post => post.profile.displayName === displayName
    );
    if (existingPost)
      throw new ValidationException(
        `Already have an post with the provided display name: ${displayName}`,
        LogContext.COLLABORATION
      );
  }

  public async getContributionDefaults(
    calloutID: string
  ): Promise<ICalloutContributionDefaults> {
    const callout = await this.getCalloutOrFail(calloutID, {
      relations: { contributionDefaults: true },
    });
    if (!callout.contributionDefaults)
      throw new EntityNotInitializedException(
        `Callout (${calloutID}) not initialised as no contribution defaults`,
        LogContext.COLLABORATION
      );
    return callout.contributionDefaults;
  }

  public async getComments(calloutID: string): Promise<IRoom | undefined> {
    const callout = await this.getCalloutOrFail(calloutID, {
      relations: { comments: true },
    });
    return callout.comments;
  }

  private async getCommentsCount(calloutID: string): Promise<number> {
    const comments = await this.getComments(calloutID);
    if (!comments) return 0;
    const messages = await this.roomService.getMessages(comments);
    return messages.length;
  }

  private async setNameIdOnWhiteboardData(
    whiteboardData: CreateWhiteboardInput,
    reservedNameIDs: string[]
  ) {
    if (whiteboardData.nameID && whiteboardData.nameID.length > 0) {
      const nameIdTaken = reservedNameIDs.includes(whiteboardData.nameID);
      if (nameIdTaken)
        throw new ValidationException(
          `Unable to create Whiteboard: the provided nameID is already taken: ${whiteboardData.nameID}`,
          LogContext.SPACES
        );
    } else {
      whiteboardData.nameID =
        this.namingService.createNameIdAvoidingReservedNameIDs(
          `${whiteboardData.profile?.displayName ?? 'Whiteboard'}`,
          reservedNameIDs
        );
    }
  }

  private async setNameIdOnMemoData(
    memoData: CreateMemoInput,
    reservedNameIDs: string[]
  ) {
    if (memoData.nameID && memoData.nameID.length > 0) {
      const nameIdTaken = reservedNameIDs.includes(memoData.nameID);
      if (nameIdTaken)
        throw new ValidationException(
          `Unable to create Memo: the provided nameID is already taken: ${memoData.nameID}`,
          LogContext.SPACES
        );
    } else {
      memoData.nameID = this.namingService.createNameIdAvoidingReservedNameIDs(
        `${memoData.profile?.displayName ?? 'Memo'}`,
        reservedNameIDs
      );
    }
  }

  public async createContributionOnCallout(
    contributionData: CreateContributionOnCalloutInput,
    userID: string
  ): Promise<ICalloutContribution> {
    const calloutID = contributionData.calloutID;
    const callout = await this.getCalloutOrFail(calloutID, {
      relations: {
        contributions: true,
      },
    });
    if (!callout.settings.contribution)
      throw new EntityNotInitializedException(
        `Callout (${calloutID}) not initialised as no contributions`,
        LogContext.COLLABORATION
      );

    const reservedNameIDs =
      await this.namingService.getReservedNameIDsInCalloutContributions(
        calloutID
      );
    if (contributionData.whiteboard) {
      await this.setNameIdOnWhiteboardData(
        contributionData.whiteboard,
        reservedNameIDs
      );
    }
    if (contributionData.post) {
      await this.setNameIdOnPostData(
        contributionData.post,
        reservedNameIDs,
        callout
      );
    }
    if (contributionData.memo) {
      await this.setNameIdOnMemoData(contributionData.memo, reservedNameIDs);
    }

    if (!callout.contributions) {
      throw new EntityNotInitializedException(
        'Not able to load Contributions for this callout',
        LogContext.COLLABORATION,
        { calloutId: calloutID }
      );
    }

    // set default sort order as the minimum of the existing contributions
    // we want the new one to be first
    if (contributionData.sortOrder === undefined) {
      const contributionsSortOrder = callout.contributions.map(
        c => c.sortOrder
      );
      const minOrder = Math.min(...contributionsSortOrder);
      // first contribution
      contributionData.sortOrder = !contributionsSortOrder.length
        ? 1
        : minOrder - 1;
    }

    const storageAggregator = await this.getStorageAggregator(callout.id);
    const contribution =
      await this.contributionService.createCalloutContribution(
        contributionData,
        storageAggregator,
        callout.settings.contribution,
        undefined, // parentSpaceId — resolved by admin sync for user-initiated contributions
        userID
      );
    contribution.callout = callout;

    return await this.contributionService.save(contribution);
  }

  /**
   * Import an existing file as a CollaboraDocument contribution on the
   * callout. Mirrors `createContributionOnCallout`'s callout-loading,
   * settings validation, sortOrder defaulting, and final save — but
   * builds the doc from an uploaded file (file-service-go sniffs MIME
   * from content and rejects anything outside our supported list)
   * rather than from a typed creation input.
   *
   * The new contribution gets an empty authorization policy here; the
   * authorization-reset cycle (parent space → callout → contribution)
   * fills in credential rules on the next pass, same as the blank-
   * create path.
   */
  public async importCollaboraDocumentToCallout(
    input: ImportCollaboraDocumentInput,
    file: { buffer: Buffer; filename: string; mimetype: string },
    userID: string
  ): Promise<ICalloutContribution> {
    const callout = await this.getCalloutOrFail(input.calloutID, {
      relations: { contributions: true },
    });
    if (!callout.settings.contribution) {
      throw new EntityNotInitializedException(
        `Callout (${input.calloutID}) not initialised: no contribution settings`,
        LogContext.COLLABORATION
      );
    }
    if (
      !callout.settings.contribution.allowedTypes?.includes(
        CalloutContributionType.COLLABORA_DOCUMENT
      )
    ) {
      throw new ValidationException(
        `Callout does not allow contributions of type COLLABORA_DOCUMENT. Allowed: ${callout.settings.contribution.allowedTypes?.join(', ')}`,
        LogContext.COLLABORATION
      );
    }
    if (!callout.contributions) {
      throw new EntityNotInitializedException(
        'Not able to load Contributions for this callout',
        LogContext.COLLABORATION,
        { calloutId: input.calloutID }
      );
    }

    const storageAggregator = await this.getStorageAggregator(callout.id);

    // Build the CollaboraDocument from the upload. file-service-go
    // sniffs the MIME and rejects anything outside our supported list
    // before this returns.
    const collaboraDocument =
      await this.collaboraDocumentService.createCollaboraDocument(
        { displayName: input.displayName, uploadedFile: file },
        storageAggregator,
        userID
      );

    // Default sort order: min - 1, so the new contribution appears
    // first (same convention as createContributionOnCallout).
    let sortOrder = input.sortOrder;
    if (sortOrder === undefined) {
      const existing = callout.contributions.map(c => c.sortOrder);
      sortOrder = existing.length === 0 ? 1 : Math.min(...existing) - 1;
    }

    const contribution: ICalloutContribution = CalloutContribution.create({
      type: CalloutContributionType.COLLABORA_DOCUMENT,
      sortOrder,
    } as DeepPartial<CalloutContribution>);
    contribution.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.CALLOUT_CONTRIBUTION
    );
    contribution.createdBy = userID;
    contribution.collaboraDocument = collaboraDocument;
    contribution.callout = callout;

    return await this.contributionService.save(contribution);
  }

  public async getStorageBucket(calloutID: string): Promise<IStorageBucket> {
    const callout = await this.getCalloutOrFail(calloutID, {
      relations: {
        framing: {
          profile: {
            storageBucket: true,
          },
        },
      },
    });
    const storageBucket = callout?.framing?.profile?.storageBucket;
    if (!storageBucket) {
      throw new RelationshipNotFoundException(
        `Unable to find storage bucket to use for Callout: ${calloutID}`,
        LogContext.COLLABORATION
      );
    }
    return storageBucket;
  }

  public async getClassification(calloutID: string): Promise<IClassification> {
    const callout = await this.getCalloutOrFail(calloutID, {
      relations: {
        classification: true,
      },
    });
    const classification = callout?.classification;
    if (!classification) {
      throw new RelationshipNotFoundException(
        `Unable to find Classification to use for Callout: ${calloutID}`,
        LogContext.COLLABORATION
      );
    }
    return classification;
  }

  public async updateContributionCalloutsSortOrder(
    calloutId: string,
    sortOrderData: UpdateContributionCalloutsSortOrderInput
  ): Promise<ICalloutContribution[]> {
    const callout = await this.getCalloutOrFail(calloutId, {
      relations: {
        contributions: true,
      },
    });

    if (!callout.contributions)
      throw new EntityNotFoundException(
        `No collaborations found: ${calloutId}`,
        LogContext.COLLABORATION
      );

    const contributionsById = keyBy(callout.contributions, 'id');

    const contributionsInOrder: ICalloutContribution[] = [];
    let index = 1;
    for (const id of sortOrderData.contributionIDs) {
      const contribution = contributionsById[id];
      if (!contribution || !contribution.id) {
        throw new EntityNotFoundException(
          `Callout with requested ID (${id}) not located within current Contribution: ${calloutId}`,
          LogContext.COLLABORATION
        );
      }
      contribution.sortOrder = index;
      contributionsInOrder.push(contribution);
      index++;
    }

    return this.contributionService.save(contributionsInOrder);
  }

  public async getCalloutFraming(
    calloutID: string,
    relations: FindOneOptions<ICallout>[] = []
  ): Promise<ICalloutFraming> {
    const calloutLoaded = await this.getCalloutOrFail(calloutID, {
      relations: { framing: true, ...relations },
    });
    if (!calloutLoaded.framing)
      throw new EntityNotFoundException(
        `Callout not initialised, no framing: ${calloutID}`,
        LogContext.COLLABORATION
      );

    return calloutLoaded.framing;
  }

  public async getContributions(
    callout: ICallout,
    contributionIDs?: string[],
    types: readonly CalloutContributionType[] = AllCalloutContributionTypes,
    limit?: number,
    shuffle?: boolean
  ): Promise<ICalloutContribution[]> {
    const calloutLoaded = await this.getCalloutOrFail(callout.id, {
      relations: {
        contributions: {
          post: types.includes(CalloutContributionType.POST),
          whiteboard: types.includes(CalloutContributionType.WHITEBOARD),
          link: types.includes(CalloutContributionType.LINK),
          memo: types.includes(CalloutContributionType.MEMO),
        },
      },
      ...(!shuffle
        ? {
            order: {
              contributions: {
                sortOrder: 'ASC',
              },
            },
          }
        : undefined),
    });
    if (!calloutLoaded.contributions)
      throw new EntityNotFoundException(
        `Callout not initialized, no contributions: ${callout.id}`,
        LogContext.COLLABORATION
      );

    const results: ICalloutContribution[] = [];
    if (!contributionIDs) {
      results.push(...calloutLoaded.contributions);
    } else {
      for (const contributionID of contributionIDs) {
        const contribution = calloutLoaded.contributions.find(
          contribution => contribution.id === contributionID
        );
        if (!contribution) continue;

        results.push(contribution);
      }
    }

    const limitAndShuffled = limitAndShuffle(results, limit, shuffle);
    return limitAndShuffled;
  }

  public async getContributionsCount(
    callout: ICallout
  ): Promise<CalloutContributionsCountOutput> {
    const counts = await this.calloutRepository
      .createQueryBuilder('callout')
      .leftJoin('callout.contributions', 'contribution')
      .select('contribution.type', 'type')
      .addSelect('COUNT(contribution.id)', 'count')
      .where('callout.id = :calloutId', { calloutId: callout.id })
      .groupBy('contribution.type')
      .getRawMany<{ type: CalloutContributionType; count: string }>();

    const result: CalloutContributionsCountOutput = {
      post: 0,
      link: 0,
      whiteboard: 0,
      memo: 0,
      collaboraDocument: 0,
    };

    for (const { type, count } of counts) {
      const numCount = parseInt(count, 10);
      if (type === CalloutContributionType.POST) {
        result.post = numCount;
      } else if (type === CalloutContributionType.LINK) {
        result.link = numCount;
      } else if (type === CalloutContributionType.WHITEBOARD) {
        result.whiteboard = numCount;
      } else if (type === CalloutContributionType.MEMO) {
        result.memo = numCount;
      } else if (type === CalloutContributionType.COLLABORA_DOCUMENT) {
        result.collaboraDocument = numCount;
      }
    }

    return result;
  }

  /**
   * AC3 host-scope guard (workspace#025, FR-006/FR-007).
   * Enforced at WRITE time on CUSTOM selections with at least one id.
   *
   * CONTRIBUTORS: every selectedId must be an accepted community member of the
   *   host space (any role across USER/ORG/VC — uses the same RoleSetService
   *   reads as ContributorCollectionService). Uses three role fetches and union
   *   into a Set for the cheapest single-pass check over the submitted ids.
   * SPACES: every selectedId must be a direct subspace of the host space.
   *   Since the host's subspaces are already the only read-time resolution
   *   surface, this write-time guard is the PRIMARY barrier.
   * Template/KB context (no host space): any non-empty selection is rejected.
   *
   * Auto skips when: mode is AUTO, selectedIds is empty, or framing is not a
   * collection kind (normalization already ensures this is consistent).
   */
  private async validateSelectionScopeGuard(
    framingType: CalloutFramingType,
    selection:
      | { mode: CalloutSelectionMode; selectedIds: string[] }
      | undefined,
    hostSpaceId: string | undefined
  ): Promise<void> {
    if (!selection) return;
    if (selection.mode !== CalloutSelectionMode.CUSTOM) return;
    if (selection.selectedIds.length === 0) return;
    if (
      framingType !== CalloutFramingType.CONTRIBUTORS &&
      framingType !== CalloutFramingType.SPACES
    ) {
      return; // normalizer already rejects non-collection kinds with selection
    }

    // Non-empty CUSTOM selection without a host space → reject (template/KB).
    if (!hostSpaceId) {
      throw new ValidationException(
        'Selection requires a host space: custom selection is not allowed on template or knowledge-base callouts.',
        LogContext.COLLABORATION
      );
    }

    if (framingType === CalloutFramingType.CONTRIBUTORS) {
      await this.validateContributorSelectionScope(
        selection.selectedIds,
        hostSpaceId
      );
    } else {
      await this.validateSubspaceSelectionScope(
        selection.selectedIds,
        hostSpaceId
      );
    }
  }

  private async validateContributorSelectionScope(
    selectedIds: string[],
    hostSpaceId: string
  ): Promise<void> {
    // Load the host Space → community → roleSet
    // (Space owns the FK to Community; Community owns the FK to RoleSet).
    const spaceWithCommunity = await this.calloutRepository.manager.findOne(
      Space,
      {
        where: { id: hostSpaceId },
        relations: { community: { roleSet: true } },
      }
    );
    if (!spaceWithCommunity?.community?.roleSet) {
      throw new ValidationException(
        'Unable to resolve host community for selection scope validation.',
        LogContext.COLLABORATION
      );
    }
    const roleSet = spaceWithCommunity.community.roleSet;

    // Union all member/lead/admin ids across all three contributor actor types.
    const allRoles = [RoleName.MEMBER, RoleName.LEAD, RoleName.ADMIN];
    const eligibleIds = new Set<string>();
    for (const role of allRoles) {
      const [users, orgs, vcs] = await Promise.all([
        this.roleSetService.getUsersWithRole(roleSet, role),
        this.roleSetService.getOrganizationsWithRole(roleSet, role),
        this.roleSetService.getVirtualContributorsWithRole(roleSet, role),
      ]);
      for (const u of users) eligibleIds.add(u.id);
      for (const o of orgs) eligibleIds.add(o.id);
      for (const v of vcs) eligibleIds.add(v.id);
    }

    const offender = selectedIds.find(id => !eligibleIds.has(id));
    if (offender) {
      throw new ValidationException(
        'One or more selected contributors are not accepted community members of this space.',
        LogContext.COLLABORATION,
        { offendingId: offender }
      );
    }
  }

  private async validateSubspaceSelectionScope(
    selectedIds: string[],
    hostSpaceId: string
  ): Promise<void> {
    // Load the host space's direct subspaces.
    const hostSpace = await this.calloutRepository.manager.findOne(Space, {
      where: { id: hostSpaceId },
      relations: { subspaces: true },
    });
    const subspaceIds = new Set(
      (hostSpace?.subspaces ?? []).map((s: { id: string }) => s.id)
    );

    const offender = selectedIds.find(id => !subspaceIds.has(id));
    if (offender) {
      throw new ValidationException(
        'One or more selected subspaces are not direct subspaces of this space.',
        LogContext.COLLABORATION,
        { offendingId: offender }
      );
    }
  }

  /**
   * Look up the parent space ID for a calloutsSet by joining through Collaboration → Space.
   * Returns undefined if the calloutsSet is not attached to a space (e.g., template).
   */
  private async getParentSpaceId(
    calloutsSetId: string
  ): Promise<string | undefined> {
    try {
      const result = await this.calloutRepository.manager
        .createQueryBuilder()
        .select('s.id', 'spaceId')
        .from('callouts_set', 'cs')
        .innerJoin('collaboration', 'c', 'c."calloutsSetId" = cs.id')
        .innerJoin('space', 's', 's."collaborationId" = c.id')
        .where('cs.id = :id', { id: calloutsSetId })
        .getRawOne();
      return result?.spaceId;
    } catch {
      return undefined;
    }
  }
}
