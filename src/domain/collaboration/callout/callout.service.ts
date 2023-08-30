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
import { UserService } from '@domain/community/user/user.service';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileService } from '@domain/common/profile/profile.service';
import { PostTemplateService } from '@domain/template/post-template/post.template.service';
import { WhiteboardTemplateService } from '@domain/template/whiteboard-template/whiteboard.template.service';
import { IWhiteboardTemplate } from '@domain/template/whiteboard-template/whiteboard.template.interface';
import { IPostTemplate } from '@domain/template/post-template/post.template.interface';
import { VisualType } from '@common/enums/visual.type';
import { RoomService } from '@domain/communication/room/room.service';
import { RoomType } from '@common/enums/room.type';
import { IRoom } from '@domain/communication/room/room.interface';
import { ITagsetTemplate } from '@domain/common/tagset-template';
import { TagsetType } from '@common/enums/tagset.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { CreateTagsetInput } from '@domain/common/tagset';
import { CalloutDisplayLocation } from '@common/enums/callout.display.location';
import { IReference } from '@domain/common/reference';
import { CreateLinkOnCalloutInput } from './dto/callout.dto.create.link';
import { CreateReferenceOnProfileInput } from '@domain/common/profile/dto/profile.dto.create.reference';
import { CreateWhiteboardInput } from '@domain/common/whiteboard';
import { WhiteboardRtService } from '@domain/common/whiteboard-rt';
import { CreateWhiteboardRtInput } from '@domain/common/whiteboard-rt/types';

@Injectable()
export class CalloutService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private postService: PostService,
    private postTemplateService: PostTemplateService,
    private whiteboardTemplateService: WhiteboardTemplateService,
    private whiteboardService: WhiteboardService,
    private whiteboardRtService: WhiteboardRtService,
    private namingService: NamingService,
    private roomService: RoomService,
    private userService: UserService,
    private profileService: ProfileService,
    @InjectRepository(Callout)
    private calloutRepository: Repository<Callout>
  ) {}

  public async createCallout(
    calloutData: CreateCalloutInput,
    tagsetTemplates: ITagsetTemplate[],
    userID?: string
  ): Promise<ICallout> {
    if (
      calloutData.type == CalloutType.POST_COLLECTION &&
      !calloutData.postTemplate
    ) {
      throw new Error('Please provide a post template');
    }

    if (
      calloutData.type == CalloutType.WHITEBOARD_COLLECTION &&
      !calloutData.whiteboardTemplate
    ) {
      throw new Error('Please provide a whiteboard template');
    }

    if (calloutData.type == CalloutType.WHITEBOARD && !calloutData.whiteboard) {
      throw new Error('Please provide a whiteboard');
    }

    if (
      calloutData.type == CalloutType.WHITEBOARD_RT &&
      !calloutData.whiteboardRt
    ) {
      throw new Error('Please provide a whiteboard for real time');
    }

    if (!calloutData.sortOrder) {
      calloutData.sortOrder = 10;
    }

    // Save the post template data for creation via service
    // Note: do NOT save the callout post template that is created through ORM creation flow,
    // as otherwise get a postTemplate created without any child entities (auth etc)
    const postTemplateData = calloutData.postTemplate;
    const whiteboardTemplateData = calloutData.whiteboardTemplate;
    const calloutNameID = this.namingService.createNameID(
      `${calloutData.profile.displayName}`
    );
    const calloutCreationData = {
      ...calloutData,
      nameID: calloutData.nameID ?? calloutNameID,
    };
    const callout: ICallout = Callout.create(calloutCreationData);

    // To consider also having the default tagset as a template tagset
    const defaultTagset: CreateTagsetInput = {
      name: TagsetReservedName.DEFAULT,
      type: TagsetType.FREEFORM,
      tags: calloutData.tags,
    };
    const tagsetInputsFromTemplates =
      this.profileService.convertTagsetTemplatesToCreateTagsetInput(
        tagsetTemplates
      );
    const tagsetInputs = [defaultTagset, ...tagsetInputsFromTemplates];

    calloutData.profile.tagsets = this.profileService.updateProfileTagsetInputs(
      calloutData.profile.tagsets,
      tagsetInputs
    );
    callout.profile = await this.profileService.createProfile(
      calloutData.profile
    );

    if (calloutData.displayLocation) {
      this.updateCalloutDisplayLocationTagsetValue(
        callout,
        calloutData.displayLocation
      );
    }

    if (calloutData.type == CalloutType.POST_COLLECTION && postTemplateData) {
      callout.postTemplate = await this.postTemplateService.createPostTemplate(
        postTemplateData
      );
    }
    if (
      calloutData.type == CalloutType.WHITEBOARD_COLLECTION &&
      whiteboardTemplateData
    ) {
      callout.whiteboardTemplate =
        await this.whiteboardTemplateService.createWhiteboardTemplate(
          whiteboardTemplateData
        );
    }

    callout.authorization = new AuthorizationPolicy();
    callout.createdBy = userID ?? undefined;
    callout.visibility = calloutData.visibility ?? CalloutVisibility.DRAFT;

    const savedCallout: ICallout = await this.calloutRepository.save(callout);

    if (calloutData.type === CalloutType.POST) {
      savedCallout.comments = await this.roomService.createRoom(
        `callout-comments-${savedCallout.nameID}`,
        RoomType.CALLOUT
      );
    }

    if (calloutData.type == CalloutType.WHITEBOARD && calloutData.whiteboard) {
      const whiteboard = await this.createWhiteboardForCallout(
        calloutData.whiteboard,
        userID
      );
      savedCallout.whiteboards = [whiteboard];
    }

    if (
      calloutData.type == CalloutType.WHITEBOARD_RT &&
      calloutData.whiteboardRt
    ) {
      savedCallout.whiteboardRt = await this.createWhiteboardRtForCallout(
        calloutData.whiteboardRt,
        userID
      );
    }

    return this.calloutRepository.save(savedCallout);
  }

  private async createWhiteboardForCallout(
    data: CreateWhiteboardInput,
    authorID?: string
  ) {
    const whiteboardNameID = this.namingService.createNameID(
      `${data.profileData.displayName}`
    );

    const whiteboard = await this.whiteboardService.createWhiteboard(
      {
        nameID: whiteboardNameID,
        value: data.value,
        profileData: data.profileData,
      },
      authorID
    );
    await this.profileService.addVisualOnProfile(
      whiteboard.profile,
      VisualType.BANNER
    );

    return whiteboard;
  }

  private async createWhiteboardRtForCallout(
    data: CreateWhiteboardRtInput,
    authorID?: string
  ) {
    const whiteboardRtNameID = this.namingService.createNameID(
      `${data.profileData.displayName}`
    );

    const whiteboardRt = await this.whiteboardRtService.createWhiteboard(
      {
        nameID: whiteboardRtNameID,
        value: data.value,
        profileData: data.profileData,
      },
      authorID
    );
    await this.profileService.addVisualOnProfile(
      whiteboardRt.profile,
      VisualType.BANNER
    );

    return whiteboardRt;
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
      const publisher = await this.userService.getUserOrFail(publisherID);
      callout.publishedBy = publisher.id;
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
      relations: [
        'postTemplate',
        'whiteboardTemplate',
        'postTemplate.profile',
        'whiteboardTemplate.profile',
        'profile',
      ],
    });

    if (calloutUpdateData.profileData) {
      callout.profile = await this.profileService.updateProfile(
        callout.profile,
        calloutUpdateData.profileData
      );
    }

    if (calloutUpdateData.state) callout.state = calloutUpdateData.state;

    if (calloutUpdateData.sortOrder)
      callout.sortOrder = calloutUpdateData.sortOrder;

    if (
      callout.type == CalloutType.POST_COLLECTION &&
      callout.postTemplate &&
      calloutUpdateData.postTemplate
    ) {
      callout.postTemplate = await this.postTemplateService.updatePostTemplate(
        callout.postTemplate,
        { ID: callout.postTemplate.id, ...calloutUpdateData.postTemplate }
      );
    }

    if (
      callout.type == CalloutType.WHITEBOARD_COLLECTION &&
      callout.whiteboardTemplate &&
      calloutUpdateData.whiteboardTemplate
    ) {
      callout.whiteboardTemplate =
        await this.whiteboardTemplateService.updateWhiteboardTemplate(
          callout.whiteboardTemplate,
          {
            ID: callout.whiteboardTemplate.id,
            ...calloutUpdateData.whiteboardTemplate,
          }
        );
    }

    if (calloutUpdateData.displayLocation) {
      this.updateCalloutDisplayLocationTagsetValue(
        callout,
        calloutUpdateData.displayLocation
      );
    }

    return await this.calloutRepository.save(callout);
  }

  updateCalloutDisplayLocationTagsetValue(
    callout: ICallout,
    group: CalloutDisplayLocation
  ) {
    const displayLocationTagset = callout.profile.tagsets?.find(
      tagset => tagset.name === TagsetReservedName.CALLOUT_DISPLAY_LOCATION
    );
    if (!displayLocationTagset) {
      throw new EntityNotFoundException(
        `Callout display location tagset not found for profile: ${callout.profile.id}`,
        LogContext.TAGSET
      );
    }
    displayLocationTagset.tags = [group];
  }

  async save(callout: ICallout): Promise<ICallout> {
    return await this.calloutRepository.save(callout);
  }

  public async deleteCallout(calloutID: string): Promise<ICallout> {
    const callout = await this.getCalloutOrFail(calloutID, {
      relations: {
        posts: true,
        whiteboards: true,
        whiteboardRt: true,
        comments: true,
        postTemplate: true,
        whiteboardTemplate: true,
        profile: true,
      },
    });

    if (callout.profile) {
      await this.profileService.deleteProfile(callout.profile.id);
    }

    if (callout.whiteboards) {
      for (const whiteboard of callout.whiteboards) {
        await this.whiteboardService.deleteWhiteboard(whiteboard.id);
      }
    }

    if (callout.whiteboardRt) {
      await this.whiteboardRtService.deleteWhiteboard(callout.whiteboardRt.id);
    }

    if (callout.posts) {
      for (const post of callout.posts) {
        await this.postService.deletePost({ ID: post.id });
      }
    }

    if (callout.comments) {
      await this.roomService.deleteRoom(callout.comments);
    }

    if (callout.postTemplate) {
      await this.postTemplateService.deletePostTemplate(callout.postTemplate);
    }

    if (callout.whiteboardTemplate) {
      await this.whiteboardTemplateService.deleteWhiteboardTemplate(
        callout.whiteboardTemplate
      );
    }

    if (callout.authorization)
      await this.authorizationPolicyService.delete(callout.authorization);

    const result = await this.calloutRepository.remove(callout as Callout);
    result.id = calloutID;

    return result;
  }

  public async getProfile(
    calloutInput: ICallout,
    relations: FindOptionsRelationByString = []
  ): Promise<IProfile> {
    const callout = await this.getCalloutOrFail(calloutInput.id, {
      relations: ['profile', ...relations],
    });
    if (!callout.profile)
      throw new EntityNotFoundException(
        `Callout profile not initialised: ${calloutInput.id}`,
        LogContext.COLLABORATION
      );

    return callout.profile;
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
      relations: { profile: { references: true } },
    });

    return callout?.profile.references?.length ?? 0;
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
    if (!callout.posts || !callout.profile)
      throw new EntityNotInitializedException(
        `Callout (${calloutID}) not initialised`,
        LogContext.COLLABORATION
      );

    await this.setNameIdOnPostData(postData, callout);

    const post = await this.postService.createPost(postData, userID);
    callout.posts.push(post);
    await this.calloutRepository.save(callout);
    return post;
  }

  public async createLinkOnCallout(
    linkData: CreateLinkOnCalloutInput
  ): Promise<IReference> {
    const calloutID = linkData.calloutID;
    const callout = await this.getCalloutOrFail(calloutID, {
      relations: ['profile', 'profile.references'],
    });
    if (!callout.profile || !callout.profile.references)
      throw new EntityNotInitializedException(
        `Callout (${calloutID}) not initialised`,
        LogContext.COLLABORATION
      );
    const referenceInput: CreateReferenceOnProfileInput = {
      profileID: callout.profile.id,
      ...linkData,
    };
    const reference = await this.profileService.createReference(referenceInput);
    return reference;
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

    const whiteboard = await this.whiteboardService.createWhiteboard(
      {
        nameID: whiteboardData.nameID,
        value: whiteboardData.value,
        profileData: whiteboardData.profileData,
      },
      userID
    );
    callout.whiteboards.push(whiteboard);
    await this.calloutRepository.save(callout);
    return whiteboard;
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

  public async getWhiteboardRt(callout: ICallout) {
    const res: ICallout = await this.calloutRepository.findOneOrFail({
      where: { id: callout.id },
      relations: { whiteboardRt: true },
    });

    return res.whiteboardRt;
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

  public async getPostTemplateFromCallout(
    calloutID: string
  ): Promise<IPostTemplate | undefined> {
    const loadedCallout = await this.getCalloutOrFail(calloutID, {
      relations: ['postTemplate'],
    });
    return loadedCallout.postTemplate;
  }

  public async getWhiteboardTemplateFromCallout(
    calloutID: string
  ): Promise<IWhiteboardTemplate | undefined> {
    const loadedCallout = await this.getCalloutOrFail(calloutID, {
      relations: ['whiteboardTemplate'],
    });
    return loadedCallout.whiteboardTemplate;
  }
}
