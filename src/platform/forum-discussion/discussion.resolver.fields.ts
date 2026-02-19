import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { ProfileLoaderCreator } from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthorizationActorHasPrivilege,
  Profiling,
} from '@src/common/decorators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IRoom } from '../../domain/communication/room/room.interface';
import { Discussion } from './discussion.entity';
import { IDiscussion } from './discussion.interface';
import { DiscussionService } from './discussion.service';

@Resolver(() => IDiscussion)
export class DiscussionResolverFields {
  constructor(
    private discussionService: DiscussionService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @ResolveField('timestamp', () => Number, {
    nullable: true,
    description: 'The timestamp for the creation of this Discussion.',
  })
  async timestamp(@Parent() discussion: IDiscussion): Promise<number> {
    const createdDate = (discussion as Discussion).createdDate;
    const date = new Date(createdDate);
    return date.getTime();
  }

  @ResolveField('createdBy', () => UUID, {
    nullable: true,
    description: 'The id of the user that created this discussion',
  })
  async createdBy(@Parent() discussion: IDiscussion): Promise<string | null> {
    const createdBy = discussion.createdBy;

    if (!createdBy) {
      this.logger?.warn(
        `createdBy '${createdBy}' unable to be resolved when resolving discussion '${discussion.id}'`,
        LogContext.COLLABORATION
      );
      return null;
    }

    return createdBy;
  }

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('comments', () => IRoom, {
    nullable: false,
    description: 'The comments for this Discussion.',
  })
  async comments(@Parent() discussion: IDiscussion): Promise<IRoom> {
    return await this.discussionService.getComments(discussion.id);
  }

  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for this Discussion.',
  })
  @Profiling.api
  async profile(
    @Parent() discussion: IDiscussion,
    @Loader(ProfileLoaderCreator, { parentClassRef: Discussion })
    loader: ILoader<IProfile>
  ): Promise<IProfile> {
    return loader.load(discussion.id);
  }
}
