import { LogContext } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import {
  AllCalloutContributionTypes,
  CalloutContributionType,
} from '@common/enums/callout.contribution.type';
import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { RoomType } from '@common/enums/room.type';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { limitAndShuffle } from '@common/utils';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { CreateCalloutInput } from '@domain/collaboration/callout/dto/index';
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
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { eq, sql } from 'drizzle-orm';
import { callouts } from './callout.schema';
import { calloutContributions } from '../callout-contribution/callout.contribution.schema';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { cloneDeep, keyBy, merge } from 'lodash';
import { ICalloutContribution } from '../callout-contribution/callout.contribution.interface';
import { CalloutContributionService } from '../callout-contribution/callout.contribution.service';
import { UpdateContributionCalloutsSortOrderInput } from '../callout-contribution/dto/callout.contribution.dto.update.callouts.sort.order';
import { ICalloutContributionDefaults } from '../callout-contribution-defaults/callout.contribution.defaults.interface';
import { CalloutContributionDefaultsService } from '../callout-contribution-defaults/callout.contribution.defaults.service';
import { ICalloutFraming } from '../callout-framing/callout.framing.interface';
import { CalloutFramingService } from '../callout-framing/callout.framing.service';
import { DefaultCalloutSettings } from '../callout-settings/callout.settings.default';
import { ICalloutSettings } from '../callout-settings/callout.settings.interface';
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
    private storageAggregatorResolverService: StorageAggregatorResolverService,
    private classificationService: ClassificationService,
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb
  ) {}

  public async createCallout(
    calloutData: CreateCalloutInput,
    classificationTagsetTemplates: ITagsetTemplate[],
    storageAggregator: IStorageAggregator,
    userID?: string
  ): Promise<ICallout> {
    this.validateCreateCalloutData(calloutData);

    if (!calloutData.sortOrder) {
      calloutData.sortOrder = 10;
    }

    const callout: ICallout = Callout.create(calloutData as Partial<Callout>);
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

    if (callout.settings.visibility === CalloutVisibility.PUBLISHED) {
      callout.publishedDate = new Date();
      callout.publishedBy = userID;
    }

    callout.classification = this.classificationService.createClassification(
      classificationTagsetTemplates,
      calloutData.classification
    );

    callout.contributionDefaults =
      await this.contributionDefaultsService.createCalloutContributionDefaults(
        calloutData.contributionDefaults,
        callout.framing.profile.storageBucket
      );

    if (userID && calloutData.contributions && callout.settings.contribution) {
      callout.contributions =
        await this.contributionService.createCalloutContributions(
          calloutData.contributions,
          storageAggregator,
          callout.settings.contribution,
          userID
        );
    }

    if (!callout.isTemplate && callout.settings.framing.commentsEnabled) {
      callout.comments = await this.roomService.createRoom({
        displayName: `callout-comments-${callout.nameID}`,
        type: RoomType.CALLOUT,
      });
    }

    return callout;
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
    options?: {
      relations?: {
        authorization?: boolean;
        framing?: boolean | {
          profile?: boolean | { storageBucket?: boolean; tagsets?: boolean };
          whiteboard?: boolean | { profile?: boolean | { storageBucket?: boolean } };
          link?: boolean;
          memo?: boolean | { profile?: boolean };
          mediaGallery?: boolean;
        };
        classification?: boolean | { tagsets?: boolean };
        contributionDefaults?: boolean;
        contributions?: boolean | {
          post?: boolean | { profile?: boolean | { tagsets?: boolean; storageBucket?: boolean } };
          whiteboard?: boolean | { profile?: boolean | { storageBucket?: boolean } };
          link?: boolean | { profile?: boolean | { storageBucket?: boolean } };
          memo?: boolean | { profile?: boolean | { storageBucket?: boolean } };
        };
        comments?: boolean;
        calloutsSet?: boolean | {
          authorization?: boolean;
          collaboration?: boolean | {
            space?: boolean | {
              community?: boolean | {
                roleSet?: boolean;
              };
            };
          };
        };
      };
    }
  ): Promise<ICallout | never> {
    const withClause = this.buildWithClause(options?.relations);
    const callout = await this.db.query.callouts.findFirst({
      where: eq(callouts.id, calloutID),
      ...(withClause ? { with: withClause } : {}),
    }) as unknown as ICallout;

    if (!callout)
      throw new EntityNotFoundException(
        `No Callout found with the given id: ${calloutID}`,
        LogContext.COLLABORATION
      );
    return callout;
  }

  private buildWithClause(
    relations?: Record<string, boolean | Record<string, any>>
  ): Record<string, any> | undefined {
    if (!relations) return undefined;
    const withClause: Record<string, any> = {};
    for (const [key, value] of Object.entries(relations)) {
      if (value === true) {
        withClause[key] = true;
      } else if (typeof value === 'object' && value !== null) {
        withClause[key] = { with: this.buildWithClause(value) };
      }
    }
    return Object.keys(withClause).length > 0 ? withClause : undefined;
  }

  public async updateCalloutVisibility(
    calloutVisibilityUpdateData: UpdateCalloutVisibilityInput
  ): Promise<ICallout> {
    const callout = await this.getCalloutOrFail(
      calloutVisibilityUpdateData.calloutID
    );

    if (calloutVisibilityUpdateData.visibility)
      callout.settings.visibility = calloutVisibilityUpdateData.visibility;

    return await this.save(callout);
  }

  public async updateCalloutPublishInfo(
    callout: ICallout,
    publisherID?: string,
    publishedTimestamp?: number
  ): Promise<ICallout> {
    if (publisherID) {
      const publisher = await this.userLookupService.getUserByUUID(publisherID);
      callout.publishedBy = publisher?.id || '';
    }

    if (publishedTimestamp) {
      const date = new Date(publishedTimestamp);
      callout.publishedDate = date;
    }

    return await this.save(callout);
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
      callout.settings = merge(callout.settings, calloutUpdateData.settings);
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
      callout.comments = await this.roomService.createRoom({
        displayName: `callout-comments-${callout.nameID}`,
        type: RoomType.CALLOUT,
      });
    }

    if (calloutUpdateData.sortOrder)
      callout.sortOrder = calloutUpdateData.sortOrder;

    return await this.save(callout);
  }

  async save(callout: ICallout): Promise<ICallout> {
    const [result] = await this.db
      .insert(callouts)
      .values(callout as any)
      .onConflictDoUpdate({
        target: callouts.id,
        set: callout as any,
      })
      .returning();
    return result as unknown as ICallout;
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

    await this.db.delete(callouts).where(eq(callouts.id, calloutID));
    const result = { ...callout };
    result.id = calloutID;

    return result;
  }

  public async getCallouts(options?: {
    where?: { calloutsSetId?: string };
    relations?: Record<string, boolean | Record<string, any>>;
  }): Promise<ICallout[]> {
    const withClause = this.buildWithClause(options?.relations);
    const results = await this.db.query.callouts.findMany({
      ...(options?.where?.calloutsSetId
        ? { where: eq(callouts.calloutsSetId, options.where.calloutsSetId) }
        : {}),
      ...(withClause ? { with: withClause } : {}),
    });
    return results as unknown as ICallout[];
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
        userID
      );
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
    additionalRelations: Record<string, boolean | Record<string, any>> = {}
  ): Promise<ICalloutFraming> {
    const calloutLoaded = await this.getCalloutOrFail(calloutID, {
      relations: { framing: true, ...additionalRelations },
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
    const contributionsWith: Record<string, boolean> = {};
    if (types.includes(CalloutContributionType.POST)) contributionsWith.post = true;
    if (types.includes(CalloutContributionType.WHITEBOARD)) contributionsWith.whiteboard = true;
    if (types.includes(CalloutContributionType.LINK)) contributionsWith.link = true;
    if (types.includes(CalloutContributionType.MEMO)) contributionsWith.memo = true;

    const calloutLoaded = await this.getCalloutOrFail(callout.id, {
      relations: {
        contributions: contributionsWith,
      },
    });
    if (!calloutLoaded.contributions)
      throw new EntityNotFoundException(
        `Callout not initialized, no contributions: ${callout.id}`,
        LogContext.COLLABORATION
      );

    // Sort by sortOrder ASC unless shuffling
    if (!shuffle) {
      calloutLoaded.contributions.sort((a, b) => a.sortOrder - b.sortOrder);
    }

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
    const counts = await this.db
      .select({
        type: calloutContributions.type,
        count: sql<string>`count(${calloutContributions.id})`,
      })
      .from(calloutContributions)
      .where(eq(calloutContributions.calloutId, callout.id))
      .groupBy(calloutContributions.type);

    const result: CalloutContributionsCountOutput = {
      post: 0,
      link: 0,
      whiteboard: 0,
      memo: 0,
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
      }
    }

    return result;
  }
}
