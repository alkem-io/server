import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import {
  CreateCalloutInput,
  UpdateCalloutInput,
} from '@domain/collaboration/callout/dto/index';
import { limitAndShuffle } from '@common/utils';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { UUID_LENGTH } from '@common/constants/entity.field.length.constants';
import { CalloutType } from '@common/enums/callout.type';
import { UpdateCalloutVisibilityInput } from './dto/callout.dto.update.visibility';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { RoomService } from '@domain/communication/room/room.service';
import { RoomType } from '@common/enums/room.type';
import { IRoom } from '@domain/communication/room/room.interface';
import { ITagsetTemplate } from '@domain/common/tagset-template';
import { UserLookupService } from '@services/infrastructure/user-lookup/user.lookup.service';
import { CalloutFramingService } from '../callout-framing/callout.framing.service';
import { ICalloutFraming } from '../callout-framing/callout.framing.interface';
import { CalloutContributionDefaultsService } from '../callout-contribution-defaults/callout.contribution.defaults.service';
import { CalloutContributionPolicyService } from '../callout-contribution-policy/callout.contribution.policy.service';
import { ICalloutContribution } from '../callout-contribution/callout.contribution.interface';
import { CreateContributionOnCalloutInput } from './dto/callout.dto.create.contribution';
import { CalloutContributionService } from '../callout-contribution/callout.contribution.service';
import { CreateWhiteboardInput } from '@domain/common/whiteboard/dto/whiteboard.dto.create';
import { CreatePostInput } from '../post/dto/post.dto.create';
import { ICalloutContributionPolicy } from '../callout-contribution-policy/callout.contribution.policy.interface';
import { ICalloutContributionDefaults } from '../callout-contribution-defaults/callout.contribution.defaults.interface';
import { CalloutContributionFilterArgs } from '../callout-contribution/dto/callout.contribution.args.filter';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';

@Injectable()
export class CalloutService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private namingService: NamingService,
    private roomService: RoomService,
    private userLookupService: UserLookupService,
    private calloutFramingService: CalloutFramingService,
    private contributionDefaultsService: CalloutContributionDefaultsService,
    private contributionPolicyService: CalloutContributionPolicyService,
    private contributionService: CalloutContributionService,
    private storageAggregatorResolverService: StorageAggregatorResolverService,
    @InjectRepository(Callout)
    private calloutRepository: Repository<Callout>
  ) {}

  public async createCallout(
    calloutData: CreateCalloutInput,
    tagsetTemplates: ITagsetTemplate[],
    storageAggregator: IStorageAggregator,
    userID?: string
  ): Promise<ICallout> {
    this.validateCreateCalloutData(calloutData);

    if (!calloutData.sortOrder) {
      calloutData.sortOrder = 10;
    }
    const calloutNameID = this.namingService.createNameID(
      `${calloutData.framing.profile.displayName}`
    );
    const calloutCreationData = {
      ...calloutData,
      nameID: calloutData.nameID ?? calloutNameID,
    };

    const callout: ICallout = Callout.create(calloutCreationData);
    callout.authorization = new AuthorizationPolicy();
    callout.createdBy = userID ?? undefined;
    callout.visibility = calloutData.visibility ?? CalloutVisibility.DRAFT;
    callout.contributions = [];

    callout.framing = await this.calloutFramingService.createCalloutFraming(
      calloutData.framing,
      tagsetTemplates,
      storageAggregator,
      userID
    );
    if (calloutData.groupName) {
      this.calloutFramingService.updateCalloutGroupTagsetValue(
        callout.framing,
        calloutData.groupName
      );
    }

    callout.contributionDefaults =
      this.contributionDefaultsService.createCalloutContributionDefaults(
        calloutData.contributionDefaults
      );

    const policyData =
      this.contributionPolicyService.updateContributionPolicyInput(
        calloutData.type,
        calloutData.contributionPolicy
      );
    callout.contributionPolicy =
      this.contributionPolicyService.createCalloutContributionPolicy(
        policyData
      );

    if (calloutData.type === CalloutType.POST) {
      callout.comments = await this.roomService.createRoom(
        `callout-comments-${callout.nameID}`,
        RoomType.CALLOUT
      );
    }

    return this.calloutRepository.save(callout);
  }

  private validateCreateCalloutData(calloutData: CreateCalloutInput) {
    if (
      calloutData.type == CalloutType.WHITEBOARD_COLLECTION &&
      !calloutData.contributionDefaults?.whiteboardContent
    ) {
      throw new ValidationException(
        'Please provide a whiteboard template',
        LogContext.COLLABORATION
      );
    }

    if (
      calloutData.type == CalloutType.WHITEBOARD &&
      !calloutData.framing.whiteboard
    ) {
      throw new ValidationException(
        'Please provide a whiteboard',
        LogContext.COLLABORATION
      );
    }
  }

  private async getStorageAggregator(
    callout: ICallout
  ): Promise<IStorageAggregator> {
    return await this.storageAggregatorResolverService.getStorageAggregatorForCallout(
      callout.id
    );
  }

  public async getCalloutOrFail(
    calloutID: string,
    options?: FindOneOptions<Callout>
  ): Promise<ICallout | never> {
    let callout: ICallout | null = null;
    if (calloutID.length === UUID_LENGTH) {
      callout = await this.calloutRepository.findOne({
        where: { id: calloutID },
        ...options,
      });
    }
    if (!callout) {
      // look up based on nameID
      callout = await this.calloutRepository.findOne({
        where: { nameID: calloutID },
        ...options,
      });
    }
    if (!callout)
      throw new EntityNotFoundException(
        `No Callout found with the given id: ${calloutID}`,
        LogContext.COLLABORATION
      );
    return callout;
  }

  public async updateCalloutVisibility(
    calloutUpdateData: UpdateCalloutVisibilityInput
  ): Promise<ICallout> {
    const callout = await this.getCalloutOrFail(calloutUpdateData.calloutID);

    if (calloutUpdateData.visibility)
      callout.visibility = calloutUpdateData.visibility;

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
    calloutUpdateData: UpdateCalloutInput
  ): Promise<ICallout> {
    const callout = await this.getCalloutOrFail(calloutUpdateData.ID, {
      relations: {
        contributionDefaults: true,
        contributionPolicy: true,
        framing: true,
      },
    });

    if (!callout.contributionDefaults || !callout.contributionPolicy) {
      throw new EntityNotInitializedException(
        `Unable to load callout: ${callout.id}`,
        LogContext.COLLABORATION
      );
    }

    if (calloutUpdateData.framing) {
      callout.framing = await this.calloutFramingService.updateCalloutFraming(
        callout.framing,
        calloutUpdateData.framing
      );
    }

    if (calloutUpdateData.contributionPolicy) {
      callout.contributionPolicy =
        this.contributionPolicyService.updateCalloutContributionPolicy(
          callout.contributionPolicy,
          calloutUpdateData.contributionPolicy
        );
    }

    if (calloutUpdateData.contributionDefaults) {
      callout.contributionDefaults =
        this.contributionDefaultsService.updateCalloutContributionDefaults(
          callout.contributionDefaults,
          calloutUpdateData.contributionDefaults
        );
    }

    if (calloutUpdateData.sortOrder)
      callout.sortOrder = calloutUpdateData.sortOrder;

    if (calloutUpdateData.groupName) {
      this.calloutFramingService.updateCalloutGroupTagsetValue(
        callout.framing,
        calloutUpdateData.groupName
      );
    }

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
        contributionPolicy: true,
        framing: true,
      },
    });

    if (
      !callout.contributionDefaults ||
      !callout.contributionPolicy ||
      !callout.contributions
    ) {
      throw new EntityNotInitializedException(
        `Unable to load callout for deleting: ${callout.id}`,
        LogContext.COLLABORATION
      );
    }

    await this.calloutFramingService.delete(callout.framing);
    for (const contribution of callout.contributions) {
      await this.contributionService.delete(contribution);
    }

    if (callout.comments) {
      await this.roomService.deleteRoom(callout.comments);
    }

    await this.contributionDefaultsService.delete(callout.contributionDefaults);
    await this.contributionPolicyService.delete(callout.contributionPolicy);

    if (callout.authorization)
      await this.authorizationPolicyService.delete(callout.authorization);

    const result = await this.calloutRepository.remove(callout as Callout);
    result.id = calloutID;

    return result;
  }

  public async createCalloutInputFromCallout(
    calloutInput: ICallout
  ): Promise<CreateCalloutInput> {
    const callout = await this.getCalloutOrFail(calloutInput.id, {
      relations: {
        contributionDefaults: true,
        contributionPolicy: true,
        framing: {
          profile: {
            references: true,
            location: true,
            tagsets: true,
          },
          whiteboard: {
            profile: true,
          },
        },
      },
    });
    const calloutGroupTagset =
      await this.calloutFramingService.getCalloutGroupTagset(callout.framing);
    return {
      nameID: callout.nameID,
      type: callout.type,
      visibility: callout.visibility,
      groupName: calloutGroupTagset.tags[0],
      framing:
        this.calloutFramingService.createCalloutFramingInputFromCalloutFraming(
          callout.framing
        ),
      contributionDefaults:
        this.contributionDefaultsService.createCalloutContributionDefaultsInputFromCalloutContributionDefaults(
          callout.contributionDefaults
        ),
      contributionPolicy:
        this.contributionPolicyService.createCalloutContributionPolicyInputFromCalloutContributionPolicy(
          callout.contributionPolicy
        ),
      sortOrder: callout.sortOrder,
    };
  }

  public async getActivityCount(callout: ICallout): Promise<number> {
    const result = 0;
    switch (callout.type) {
      case CalloutType.POST_COLLECTION:
      case CalloutType.WHITEBOARD_COLLECTION:
      case CalloutType.LINK_COLLECTION:
        return await this.contributionService.getContributionsInCalloutCount(
          callout.id
        );
    }

    const comments = await this.getComments(callout.id);
    if (comments) {
      return comments.messagesCount;
    }

    return result;
  }

  private async setNameIdOnPostData(
    postData: CreatePostInput,
    callout: ICallout
  ) {
    if (postData.nameID && postData.nameID.length > 0) {
      const nameAvailable =
        await this.namingService.isPostNameIdAvailableInCallout(
          postData.nameID,
          callout.id
        );
      if (!nameAvailable)
        throw new ValidationException(
          `Unable to create Post: the provided nameID is already taken: ${postData.nameID}`,
          LogContext.CHALLENGES
        );
    } else {
      postData.nameID = this.namingService.createNameID(
        postData.profileData.displayName
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

  public async getContributionPolicy(
    calloutID: string
  ): Promise<ICalloutContributionPolicy> {
    const callout = await this.getCalloutOrFail(calloutID, {
      relations: { contributionPolicy: true },
    });
    if (!callout.contributionPolicy)
      throw new EntityNotInitializedException(
        `Callout (${calloutID}) not initialised as it does not have contribution policy`,
        LogContext.COLLABORATION
      );
    return callout.contributionPolicy;
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

  private async setNameIdOnWhiteboardData(
    whiteboardData: CreateWhiteboardInput,
    callout: ICallout
  ) {
    if (whiteboardData.nameID && whiteboardData.nameID.length > 0) {
      const nameAvailable =
        await this.namingService.isWhiteboardNameIdAvailableInCallout(
          whiteboardData.nameID,
          callout.id
        );
      if (!nameAvailable)
        throw new ValidationException(
          `Unable to create Whiteboard: the provided nameID is already taken: ${whiteboardData.nameID}`,
          LogContext.CHALLENGES
        );
    } else {
      whiteboardData.nameID = this.namingService.createNameID(
        `${whiteboardData.profileData.displayName}`
      );
    }
  }

  public async createContributionOnCallout(
    contributionData: CreateContributionOnCalloutInput,
    userID: string
  ): Promise<ICalloutContribution> {
    const calloutID = contributionData.calloutID;
    const callout = await this.getCalloutOrFail(calloutID, {
      relations: { contributions: true, contributionPolicy: true },
    });
    if (!callout.contributions || !callout.contributionPolicy)
      throw new EntityNotInitializedException(
        `Callout (${calloutID}) not initialised as no contributions`,
        LogContext.COLLABORATION
      );

    if (contributionData.whiteboard) {
      await this.setNameIdOnWhiteboardData(
        contributionData.whiteboard,
        callout
      );
    }
    if (contributionData.post) {
      await this.setNameIdOnPostData(contributionData.post, callout);
    }

    const storageAggregator = await this.getStorageAggregator(callout);
    const contribution =
      await this.contributionService.createCalloutContribution(
        contributionData,
        storageAggregator,
        callout.contributionPolicy,
        userID
      );
    callout.contributions.push(contribution);
    await this.calloutRepository.save(callout);

    return contribution;
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
    relations?: FindOptionsRelations<ICallout>,
    contributionIDs?: string[],
    filter?: CalloutContributionFilterArgs,
    limit?: number,
    shuffle?: boolean
  ): Promise<ICalloutContribution[]> {
    const calloutLoaded = await this.getCalloutOrFail(callout.id, {
      relations: {
        contributions: {
          whiteboard: true,
        },
        ...relations,
      },
    });
    if (!calloutLoaded.contributions)
      throw new EntityNotFoundException(
        `Callout not initialised, no contributions: ${callout.id}`,
        LogContext.COLLABORATION
      );

    const results: ICalloutContribution[] = [];
    if (!contributionIDs) {
      if (!filter) {
        const limitAndShuffled = limitAndShuffle(
          calloutLoaded.contributions,
          limit,
          shuffle
        );
        return limitAndShuffled;
      }

      for (const contribution of calloutLoaded.contributions) {
        if (
          contribution.whiteboard &&
          filter.whiteboardIDs &&
          !filter.whiteboardIDs.includes(contribution.whiteboard.id) &&
          !filter.whiteboardIDs.includes(contribution.whiteboard.nameID)
        )
          continue;
        if (
          contribution.post &&
          filter.postIDs &&
          !filter.postIDs.includes(contribution.post.id) &&
          !filter.postIDs.includes(contribution.post.nameID)
        )
          continue;
        if (
          contribution.link &&
          filter.linkIDs &&
          !filter.linkIDs.includes(contribution.link.id)
        )
          continue;

        results.push(contribution);
      }
      return results;
    }

    for (const contributionID of contributionIDs) {
      const contribution = calloutLoaded.contributions.find(
        contribution => contribution.id === contributionID
      );
      if (!contribution) continue;
      if (
        contribution.whiteboard &&
        filter?.whiteboardIDs &&
        (!filter.whiteboardIDs.includes(contribution.whiteboard.id) ||
          !filter.whiteboardIDs.includes(contribution.whiteboard.nameID))
      )
        continue;
      if (
        contribution.post &&
        filter?.postIDs &&
        (!filter.postIDs.includes(contribution.post.id) ||
          !filter.postIDs.includes(contribution.post.nameID))
      )
        continue;
      if (
        contribution.link &&
        filter?.linkIDs &&
        !filter.linkIDs.includes(contribution.link.id)
      )
        continue;

      results.push(contribution);
    }
    return results;
  }
}
