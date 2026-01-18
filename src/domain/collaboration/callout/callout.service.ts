import { LogContext } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import {
  AllCalloutContributionTypes,
  CalloutContributionType,
} from '@common/enums/callout.contribution.type';
import { CalloutFramingType } from '@common/enums/callout.framing.type';
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
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { cloneDeep, keyBy, merge } from 'lodash';
import { FindManyOptions, FindOneOptions, Repository } from 'typeorm';
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
    @InjectRepository(Callout)
    private calloutRepository: Repository<Callout>
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

    const callout: ICallout = Callout.create(calloutData);
    callout.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.CALLOUT
    );
    callout.createdBy = userID ?? undefined;
    callout.contributions = [];

    callout.framing = await this.calloutFramingService.createCalloutFraming(
      calloutData.framing,
      storageAggregator,
      userID
    );

    callout.settings = this.createCalloutSettings(calloutData.settings);

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
    options?: FindOneOptions<Callout>
  ): Promise<ICallout | never> {
    const callout = await this.calloutRepository.findOne({
      where: { id: calloutID },
      ...options,
    });

    if (!callout)
      throw new EntityNotFoundException(
        `No Callout found with the given id: ${calloutID}, using options: ${JSON.stringify(
          options
        )}`,
        LogContext.COLLABORATION
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
      const publisher = await this.userLookupService.getUserByUUID(publisherID);
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
