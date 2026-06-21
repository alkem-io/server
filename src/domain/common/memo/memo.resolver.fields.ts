import { LogContext } from '@common/enums/logging.context';
import {
  ProfileLoaderCreator,
  UserLoaderCreator,
} from '@core/dataloader/creators';
import {
  MemoContentLoaderCreator,
  MemoContentLoaderResult,
} from '@core/dataloader/creators/loader.creators/memo/memo.content.loader.creator';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { IUser } from '@domain/community/user/user.interface';
import { Inject, LoggerService } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IProfile } from '../profile/profile.interface';
import { Markdown } from '../scalars/scalar.markdown';
import { Memo } from './memo.entity';
import { IMemo } from './memo.interface';
import { MemoService } from './memo.service';

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
  public async content(
    @Parent() memo: IMemo,
    @Loader(MemoContentLoaderCreator, { resolveToNull: true })
    loader: ILoader<MemoContentLoaderResult | null>
  ): Promise<string | null> {
    // Content lives in the memo's storage bucket as a Yjs-V2 snapshot (R2/FR-005),
    // not the dropped inline column; fetch it from file-service (batched) by
    // pointer. No pointer (empty-on-create / pre-first-save) → null.
    const result = await this.loadContent(memo, loader);
    return result?.contentBase64 ?? null;
  }

  @ResolveField(() => Markdown, {
    nullable: true,
    description: 'The last saved content of the Memo, represented in Markdown.',
  })
  public async markdown(
    @Parent() memo: IMemo,
    @Loader(MemoContentLoaderCreator, { resolveToNull: true })
    loader: ILoader<MemoContentLoaderResult | null>
  ): Promise<string | null> {
    // Derived from the stored snapshot (FR-006) — batched file-service read +
    // `yjsStateToMarkdown`, replacing the dropped inline `content` read.
    const result = await this.loadContent(memo, loader);
    return result?.markdown ?? null;
  }

  /**
   * Loads the memo's content-snapshot record (markdown + base64) via the batched
   * file-service loader, keyed by `contentPointer`. Returns `null` when the memo
   * has no pointer yet (empty creation / not-yet-persisted snapshot) or the
   * snapshot is missing / un-decodable.
   */
  private async loadContent(
    memo: IMemo,
    loader: ILoader<MemoContentLoaderResult | null>
  ): Promise<MemoContentLoaderResult | null> {
    if (!memo.contentPointer) {
      return null;
    }
    const result = await loader.load(memo.contentPointer);
    // The loader resolves a miss to null (resolveToNull); never throws here.
    return result && !(result instanceof Error) ? result : null;
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
