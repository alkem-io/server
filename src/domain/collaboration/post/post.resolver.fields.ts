import { Profiling } from '@common/decorators/profiling.decorator';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions';
import { ProfileLoaderCreator } from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { Post } from '@domain/collaboration/post/post.entity';
import { IProfile } from '@domain/common/profile/profile.interface';
import { IUser } from '@domain/community/user/user.interface';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Inject, LoggerService } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IPost } from './post.interface';

@Resolver(() => IPost)
export class PostResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private userLookupService: UserLookupService
  ) {}

  @ResolveField('createdBy', () => IUser, {
    nullable: true,
    description: 'The user that created this Post',
  })
  async createdBy(@Parent() post: IPost): Promise<IUser | null> {
    const createdBy = post.createdBy;
    if (!createdBy) {
      return null;
    }

    try {
      return await this.userLookupService.getUserByUUID(createdBy);
    } catch (e: unknown) {
      if (e instanceof EntityNotFoundException) {
        this.logger?.warn(
          `createdBy '${createdBy}' unable to be resolved when resolving post '${post.id}'`,
          LogContext.COLLABORATION
        );
        return null;
      } else {
        throw e;
      }
    }
  }

  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for this Post.',
  })
  @Profiling.api
  async profile(
    @Parent() post: IPost,
    @Loader(ProfileLoaderCreator, { parentClassRef: Post })
    loader: ILoader<IProfile>
  ): Promise<IProfile> {
    return loader.load(post.id);
  }
}
