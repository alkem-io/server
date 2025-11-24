import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Profiling } from '@src/common/decorators';
import { IUser } from '@domain/community/user/user.interface';
import { LogContext } from '@common/enums/logging.context';
import { Loader } from '@core/dataloader/decorators';
import { IProfile } from '../profile/profile.interface';
import { IPoll } from './poll.interface';
import {
  ProfileLoaderCreator,
  UserLoaderCreator,
} from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { Poll } from './poll.entity';

@Resolver(() => IPoll)
export class PollResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @ResolveField('createdBy', () => IUser, {
    nullable: true,
    description: 'The user that created this Poll',
  })
  async createdBy(
    @Parent() poll: IPoll,
    @Loader(UserLoaderCreator) loader: ILoader<IUser | null>
  ): Promise<IUser | null> {
    const createdBy = poll.createdBy;
    if (!createdBy) {
      this.logger?.warn(
        `CreatedBy not set on Poll with id ${poll.id}`,
        LogContext.COLLABORATION
      );
      return null;
    }

    return loader.load(createdBy);
  }

  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for this Poll.',
  })
  @Profiling.api
  async profile(
    @Parent() poll: IPoll,
    @Loader(ProfileLoaderCreator, { parentClassRef: Poll })
    loader: ILoader<IProfile>
  ): Promise<IProfile> {
    return loader.load(poll.id);
  }
}
