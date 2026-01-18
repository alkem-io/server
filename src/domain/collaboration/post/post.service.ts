import { LogContext, ProfileType } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { RoomType } from '@common/enums/room.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { VisualType } from '@common/enums/visual.type';
import { EntityNotFoundException } from '@common/exceptions';
import { Post } from '@domain/collaboration/post/post.entity';
import { IPost } from '@domain/collaboration/post/post.interface';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileService } from '@domain/common/profile/profile.service';
import { RoomService } from '@domain/communication/room/room.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import { CreatePostInput } from './dto/post.dto.create';
import { UpdatePostInput } from './dto/post.dto.update';

@Injectable()
export class PostService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private roomService: RoomService,
    private profileService: ProfileService,
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async createPost(
    postInput: CreatePostInput,
    storageAggregator: IStorageAggregator,
    userID: string
  ): Promise<IPost> {
    const post: IPost = Post.create(postInput);
    post.profile = await this.profileService.createProfile(
      postInput.profileData,
      ProfileType.POST,
      storageAggregator
    );
    await this.profileService.addVisualsOnProfile(
      post.profile,
      postInput.profileData.visuals,
      [VisualType.BANNER, VisualType.CARD]
    );
    await this.profileService.addOrUpdateTagsetOnProfile(post.profile, {
      name: TagsetReservedName.DEFAULT,
      tags: postInput.tags || [],
    });
    post.authorization = new AuthorizationPolicy(AuthorizationPolicyType.POST);
    post.createdBy = userID;

    post.comments = await this.roomService.createRoom({
      displayName: `post-comments-${post.nameID}`,
      type: RoomType.POST,
    });

    return post;
  }

  public async deletePost(postId: string): Promise<IPost> {
    const post = await this.getPostOrFail(postId, {
      relations: { profile: true },
    });
    if (post.authorization) {
      await this.authorizationPolicyService.delete(post.authorization);
    }
    if (post.profile) {
      await this.profileService.deleteProfile(post.profile.id);
    }
    if (post.comments) {
      await this.roomService.deleteRoom({
        roomID: post.comments.id,
      });
    }

    const result = await this.postRepository.remove(post as Post);
    result.id = postId;
    return result;
  }

  public async getPostOrFail(
    postID: string,
    options?: FindOneOptions<Post>
  ): Promise<IPost | never> {
    const post = await this.postRepository.findOne({
      where: { id: postID },
      ...options,
    });
    if (!post)
      throw new EntityNotFoundException(
        `Not able to locate post with the specified ID: ${postID}`,
        LogContext.SPACES
      );
    return post;
  }

  public async updatePost(postData: UpdatePostInput): Promise<IPost> {
    const post = await this.getPostOrFail(postData.ID, {
      relations: { profile: true, comments: true },
    });

    if (postData.profileData) {
      if (!post.profile) {
        throw new EntityNotFoundException(
          `Post not initialised: ${post.id}`,
          LogContext.COLLABORATION
        );
      }

      // Sync room name if displayName is changing
      if (
        postData.profileData.displayName &&
        post.comments &&
        post.profile.displayName !== postData.profileData.displayName
      ) {
        const newRoomName = `post-comments-${post.nameID}`;
        await this.roomService.updateRoomDisplayName(
          post.comments,
          newRoomName
        );
      }

      post.profile = await this.profileService.updateProfile(
        post.profile,
        postData.profileData
      );
    }

    await this.savePost(post);

    return post;
  }

  public async savePost(post: IPost): Promise<IPost> {
    return await this.postRepository.save(post);
  }

  public async getProfile(
    post: IPost,
    relations?: FindOptionsRelations<IPost>
  ): Promise<IProfile> {
    const postLoaded = await this.getPostOrFail(post.id, {
      relations: { profile: true, ...relations },
    });
    if (!postLoaded.profile)
      throw new EntityNotFoundException(
        `Post profile not initialised for post: ${post.id}`,
        LogContext.COLLABORATION
      );

    return postLoaded.profile;
  }

  public async getComments(postID: string) {
    const { commentsId } = await this.postRepository
      .createQueryBuilder('post')
      .select('post.commentsId', 'commentsId')
      .where({ id: postID })
      .getRawOne();

    if (!commentsId) {
      throw new EntityNotFoundException(
        `Comments not found on post: ${postID}`,
        LogContext.COLLABORATION
      );
    }

    return this.roomService.getRoomOrFail(commentsId);
  }
}
