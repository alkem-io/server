import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IUser } from '@domain/community/user/user.interface';
import { LogContext } from '@common/enums/logging.context';
import { Loader } from '@core/dataloader/decorators';
import { IProfile } from '@domain/common/profile';
import { IMemo } from './memo.interface';
import {
  ProfileLoaderCreator,
  UserLoaderCreator,
} from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { Memo } from './memo.entity';
import { MemoService } from './memo.service';
import { Markdown } from '../scalars/scalar.markdown';

@Resolver(() => IMemo)
export class MemoResolverFields {
  constructor(
    private memoService: MemoService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @ResolveField(() => String, {
    nullable: true,
    description:
      'The last saved binary stateV2 of the Yjs document, used to collaborate on the Memo, represented in base64.',
  })
  public content(@Parent() memo: IMemo): string | null {
    if (!memo.content) {
      return null;
    }

    return memo.content.toString('base64');
  }

  @ResolveField(() => Markdown, {
    nullable: true,
    description: 'The last saved content of the Memo, represented in Markdown.',
  })
  public markdown(@Parent() memo: IMemo): string | null {
    if (!memo.content) {
      return null;
    }

    return this.memoService.binaryToMarkdown(memo.content);
  }

  @ResolveField(() => Boolean, {
    nullable: false,
    description: 'Whether the Memo is multi-user enabled on Space level.',
  })
  public isMultiUser(@Parent() memo: IMemo): Promise<boolean> {
    return this.memoService.isMultiUser(memo.id);
  }

  @ResolveField('createdBy', () => IUser, {
    nullable: true,
    description: 'The user that created this Memo',
  })
  async createdBy(
    @Parent() memo: IMemo,
    @Loader(UserLoaderCreator) loader: ILoader<IUser | null>
  ): Promise<IUser | null> {
    const createdBy = memo.createdBy;
    if (!createdBy) {
      this.logger?.warn(
        `CreatedBy not set on Memo with id ${memo.id}`,
        LogContext.COLLABORATION
      );
      return null;
    }

    return loader.load(createdBy);
  }

  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for this Memo.',
  })
  async profile(
    @Parent() memo: IMemo,
    @Loader(ProfileLoaderCreator, { parentClassRef: Memo })
    loader: ILoader<IProfile>
  ): Promise<IProfile> {
    return loader.load(memo.id);
  }
}
