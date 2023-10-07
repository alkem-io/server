import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOneOptions,
  FindOptionsRelationByString,
  Repository,
} from 'typeorm';
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
  CreatePostOnCalloutInput,
  CreateWhiteboardOnCalloutInput,
  UpdateCalloutInput,
} from '@domain/collaboration/callout/dto/index';
import { IPost } from '@domain/collaboration/post/post.interface';
import { PostService } from '@domain/collaboration/post/post.service';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { limitAndShuffle } from '@common/utils';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { UUID_LENGTH } from '@common/constants/entity.field.length.constants';
import { CalloutType } from '@common/enums/callout.type';
import { UpdateCalloutVisibilityInput } from './dto/callout.dto.update.visibility';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { RoomService } from '@domain/communication/room/room.service';
import { RoomType } from '@common/enums/room.type';
import { IRoom } from '@domain/communication/room/room.interface';
import { ITagsetTemplate } from '@domain/common/tagset-template';
import { IReference } from '@domain/common/reference';
import { CreateLinkOnCalloutInput } from './dto/callout.dto.create.link';
import { UserLookupService } from '@services/infrastructure/user-lookup/user.lookup.service';
import { StorageBucketResolverService } from '@services/infrastructure/storage-bucket-resolver/storage.bucket.resolver.service';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { CalloutFramingService } from '../callout-framing/callout.framing.service';
import { ICalloutFraming } from '../callout-framing/callout.framing.interface';
import { CalloutContributionDefaultsService } from '../callout-contribution-defaults/callout.contribution.defaults.service';
import { CalloutContributionPolicyService } from '../callout-contribution-policy/callout.contribution.policy.service';
import { AgentInfo } from '@core/authentication';

@Injectable()
export class CalloutService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private postService: PostService,
    private whiteboardService: WhiteboardService,
    private namingService: NamingService,
    private roomService: RoomService,
    private userLookupService: UserLookupService,
    private storageBucketResolverService: StorageBucketResolverService,
    private calloutFramingService: CalloutFramingService,
    private contributionDefaultsService: CalloutContributionDefaultsService,
    private contributionPolicyService: CalloutContributionPolicyService,
    @InjectRepository(Callout)
    private calloutRepository: Repository<Callout>
  ) {}

  public async createCallout(
    calloutData: CreateCalloutInput,
    tagsetTemplates: ITagsetTemplate[],
    parentStorageBucket: IStorageBucket,
    userID?: string
  ): Promise<ICallout> {
    if (
      calloutData.type == CalloutType.POST_COLLECTION &&
      !calloutData.contributionDefaults?.postDescription
    ) {
      throw new Error('Please provide a post default description');
    }

    if (
      calloutData.type == CalloutType.WHITEBOARD_COLLECTION &&
      !calloutData.contributionDefaults?.whiteboardContent
    ) {
      throw new Error('Please provide a whiteboard template');
    }

    if (
      calloutData.type == CalloutType.WHITEBOARD &&
      !calloutData.framing.whiteboard
    ) {
      throw new Error('Please provide a whiteboard');
    }

    if (
      calloutData.type == CalloutType.WHITEBOARD_RT &&
      !calloutData.framing.whiteboardRt
    ) {
      throw new Error('Please provide a whiteboard for real time');
    }

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

    callout.framing = await this.calloutFramingService.createCalloutFraming(
      calloutData.framing,
      parentStorageBucket,
      tagsetTemplates,
      userID
    );

    if (calloutData.displayLocation) {
      this.calloutFramingService.updateDisplayLocationTagsetValue(
        callout.framing,
        calloutData.displayLocation
      );
    }

    callout.contributionDefaults =
      this.contributionDefaultsService.createCalloutContributionDefaults(
        calloutData.contributionDefaults
      );

    callout.contributionPolicy =
      this.contributionPolicyService.createCalloutContributionPolicy(
        calloutData.contributionPolicy
      );
    callout.authorization = new AuthorizationPolicy();
    callout.createdBy = userID ?? undefined;
    callout.visibility = calloutData.visibility ?? CalloutVisibility.DRAFT;

    if (calloutData.type === CalloutType.POST) {
      callout.comments = await this.roomService.createRoom(
        `callout-comments-${callout.nameID}`,
        RoomType.CALLOUT
      );
    }

    return this.calloutRepository.save(callout);
  }

  private async getStorageBucket(callout: ICallout): Promise<IStorageBucket> {
    return await this.storageBucketResolverService.getStorageBucketForCallout(
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
    calloutUpdateData: UpdateCalloutInput,
    agentInfo: AgentInfo
  ): Promise<ICallout> {
    const callout = await this.getCalloutOrFail(calloutUpdateData.ID, {
      relations: ['contributionDefaults', 'contributionPolicy', 'framing'],
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
        calloutUpdateData.framing,
        agentInfo
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

    if (calloutUpdateData.displayLocation) {
      this.calloutFramingService.updateDisplayLocationTagsetValue(
        callout.framing,
        calloutUpdateData.displayLocation
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
        posts: true,
        whiteboards: true,
        comments: true,
        contributionDefaults: true,
        contributionPolicy: true,
        framing: true,
      },
    });

    if (
      !callout.contributionDefaults ||
      !callout.contributionPolicy ||
      !callout.posts ||
      !callout.whiteboards ||
      !callout.comments
    ) {
      throw new EntityNotInitializedException(
        `Unable to load callout: ${callout.id}`,
        LogContext.COLLABORATION
      );
    }

    await this.calloutFramingService.delete(callout.framing);
    for (const whiteboard of callout.whiteboards) {
      await this.whiteboardService.deleteWhiteboard(whiteboard.id);
    }

    for (const post of callout.posts) {
      await this.postService.deletePost({ ID: post.id });
    }
    await this.roomService.deleteRoom(callout.comments);

    await this.contributionDefaultsService.delete(callout.contributionDefaults);
    await this.contributionPolicyService.delete(callout.contributionPolicy);

    if (callout.authorization)
      await this.authorizationPolicyService.delete(callout.authorization);

    const result = await this.calloutRepository.remove(callout as Callout);
    result.id = calloutID;

    return result;
  }

  public async getActivityCount(callout: ICallout): Promise<number> {
    const result = 0;
    if (callout.type === CalloutType.POST_COLLECTION) {
      return await this.postService.getPostsInCalloutCount(callout.id);
    } else if (callout.type === CalloutType.WHITEBOARD_COLLECTION) {
      return await this.whiteboardService.getWhiteboardsInCalloutCount(
        callout.id
      );
    } else if (callout.type === CalloutType.LINK_COLLECTION) {
      return await this.getReferencesCountInLinkCallout(callout.id);
    } else {
      const comments = await this.getComments(callout.id);
      if (comments) {
        return comments.messagesCount;
      }
    }
    return result;
  }

  private async getReferencesCountInLinkCallout(calloutId: string) {
    const callout = await this.calloutRepository.findOne({
      where: { id: calloutId },
      relations: { framing: { profile: { references: true } } },
    });

    return callout?.framing.profile.references?.length ?? 0;
  }

  private async setNameIdOnPostData(
    postData: CreatePostOnCalloutInput,
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

  public async createPostOnCallout(
    postData: CreatePostOnCalloutInput,
    userID: string
  ): Promise<IPost> {
    const calloutID = postData.calloutID;
    const callout = await this.getCalloutOrFail(calloutID, {
      relations: ['profile', 'posts', 'posts.profile'],
    });
    if (!callout.posts || !callout.framing.profile)
      throw new EntityNotInitializedException(
        `Callout (${calloutID}) not initialised`,
        LogContext.COLLABORATION
      );

    await this.setNameIdOnPostData(postData, callout);

    const storageBucket = await this.getStorageBucket(callout);
    const post = await this.postService.createPost(
      postData,
      storageBucket,
      userID
    );
    callout.posts.push(post);
    await this.calloutRepository.save(callout);
    return post;
  }

  // TODO: this is broken until have the
  public async createLinkOnCallout(
    linkData: CreateLinkOnCalloutInput
  ): Promise<IReference> {
    const framing = await this.getCalloutFraming(linkData.calloutID);

    return await this.calloutFramingService.createLinkOnCalloutFraming(
      framing.id,
      linkData
    );
  }

  public async getComments(calloutID: string): Promise<IRoom | undefined> {
    const callout = await this.getCalloutOrFail(calloutID, {
      relations: ['comments'],
    });
    return callout.comments;
  }

  private async setNameIdOnWhiteboardData(
    whiteboardData: CreateWhiteboardOnCalloutInput,
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

  public async createWhiteboardOnCallout(
    whiteboardData: CreateWhiteboardOnCalloutInput,
    userID: string
  ): Promise<IWhiteboard> {
    const calloutID = whiteboardData.calloutID;
    const callout = await this.getCalloutOrFail(calloutID, {
      relations: ['profile', 'whiteboards'],
    });
    if (!callout.whiteboards)
      throw new EntityNotInitializedException(
        `Callout (${calloutID}) not initialised`,
        LogContext.COLLABORATION
      );

    if (callout.type == CalloutType.WHITEBOARD && callout.whiteboards[0]) {
      throw new Error(
        'Whiteboard Callout cannot have more than one whiteboard'
      );
    }

    this.setNameIdOnWhiteboardData(whiteboardData, callout);

    const storageBucket = await this.getStorageBucket(callout);
    const whiteboard = await this.whiteboardService.createWhiteboard(
      {
        nameID: whiteboardData.nameID,
        content: whiteboardData.content,
        profileData: whiteboardData.profileData,
      },
      storageBucket,
      userID
    );
    callout.whiteboards.push(whiteboard);
    await this.calloutRepository.save(callout);
    return whiteboard;
  }

  public async getCalloutFraming(
    calloutID: string,
    relations: FindOptionsRelationByString = []
  ): Promise<ICalloutFraming> {
    const calloutLoaded = await this.getCalloutOrFail(calloutID, {
      relations: ['framing', ...relations],
    });
    if (!calloutLoaded.framing)
      throw new EntityNotFoundException(
        `Callout not initialised, no framing: ${calloutID}`,
        LogContext.COLLABORATION
      );

    return calloutLoaded.framing;
  }

  public async getWhiteboardsFromCallout(
    callout: ICallout,
    relations: FindOptionsRelationByString = [],
    whiteboardIDs?: string[],
    limit?: number,
    shuffle?: boolean
  ): Promise<IWhiteboard[]> {
    const calloutLoaded = await this.getCalloutOrFail(callout.id, {
      relations: ['whiteboards', ...relations],
    });
    if (!calloutLoaded.whiteboards)
      throw new EntityNotFoundException(
        `Callout not initialised, no whiteboards: ${callout.id}`,
        LogContext.COLLABORATION
      );

    if (!whiteboardIDs) {
      const limitAndShuffled = limitAndShuffle(
        calloutLoaded.whiteboards,
        limit,
        shuffle
      );
      return limitAndShuffled;
    }
    const results: IWhiteboard[] = [];
    for (const whiteboardID of whiteboardIDs) {
      const whiteboard = calloutLoaded.whiteboards.find(
        whiteboard =>
          whiteboard.id === whiteboardID || whiteboard.nameID === whiteboardID
      );
      if (!whiteboard) continue;
      results.push(whiteboard);
    }
    return results;
  }

  public async getPostsFromCallout(
    callout: ICallout,
    relations: FindOptionsRelationByString = [],
    postIDs?: string[],
    limit?: number,
    shuffle?: boolean
  ): Promise<IPost[]> {
    const loadedCallout = await this.getCalloutOrFail(callout.id, {
      relations: ['posts', ...relations],
    });
    if (!loadedCallout.posts) {
      throw new EntityNotFoundException(
        `Context not initialised: ${callout.id}`,
        LogContext.COLLABORATION
      );
    }
    if (!postIDs) {
      const limitAndShuffled = limitAndShuffle(
        loadedCallout.posts,
        limit,
        shuffle
      );
      const sortedPosts = limitAndShuffled.sort((a, b) =>
        a.nameID.toLowerCase() > b.nameID.toLowerCase() ? 1 : -1
      );
      return sortedPosts;
    }
    const results: IPost[] = [];
    for (const postID of postIDs) {
      const post = loadedCallout.posts.find(
        post => post.id === postID || post.nameID === postID.toLowerCase()
      );
      if (!post) continue;
      // toDo - in order to have this flow as 'exceptional' the client need to query only posts in callouts the posts
      // are. Currently, with the latest set of changes, callouts can be a list and without specifying the correct one in the query,
      // errors will be thrown.

      // throw new EntityNotFoundException(
      //   `Post with requested ID (${postID}) not located within current Callout: ${callout.id}`,
      //   LogContext.COLLABORATION
      // );
      results.push(post);
    }

    return results;
  }
}
