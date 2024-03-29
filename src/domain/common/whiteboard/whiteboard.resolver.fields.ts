import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Profiling } from '@src/common/decorators';
import { UseGuards } from '@nestjs/common/decorators/core/use-guards.decorator';
import { GraphqlGuard } from '@src/core/authorization/graphql.guard';
import { IUser } from '@domain/community/user/user.interface';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions';
import { Loader } from '@core/dataloader/decorators';
import { IProfile } from '../profile/profile.interface';
import { IWhiteboard } from './whiteboard.interface';
import {
  ProfileLoaderCreator,
  UserLoaderCreator,
} from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { Whiteboard } from './whiteboard.entity';
import { WhiteboardService } from './whiteboard.service';

@Resolver(() => IWhiteboard)
export class WhiteboardResolverFields {
  constructor(
    private whiteboardService: WhiteboardService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @ResolveField(() => Boolean, {
    nullable: false,
    description: 'Whether the Whiteboard is multi-user enabled on Space level.',
  })
  public isMultiUser(@Parent() whiteboard: IWhiteboard): Promise<boolean> {
    return this.whiteboardService.isMultiUser(whiteboard.id);
  }

  @ResolveField('createdBy', () => IUser, {
    nullable: true,
    description: 'The user that created this Whiteboard',
  })
  async createdBy(
    @Parent() whiteboard: IWhiteboard,
    @Loader(UserLoaderCreator, { resolveToNull: true }) loader: ILoader<IUser>
  ): Promise<IUser | null> {
    const createdBy = whiteboard.createdBy;
    if (!createdBy) {
      this.logger?.warn(
        `CreatedBy not set on Whiteboard with id ${whiteboard.id}`,
        LogContext.COLLABORATION
      );
      return null;
    }

    try {
      return await loader
        .load(createdBy)
        // empty object is result because DataLoader does not allow to return NULL values
        // handle the value when the result is returned
        .then(x => {
          return !Object.keys(x).length ? null : x;
        });
    } catch (e: unknown) {
      if (e instanceof EntityNotFoundException) {
        this.logger?.warn(
          `createdBy '${createdBy}' unable to be resolved when resolving whiteboard '${whiteboard.id}'`,
          LogContext.COLLABORATION
        );
        return null;
      } else {
        throw e;
      }
    }
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for this Whiteboard.',
  })
  @Profiling.api
  async profile(
    @Parent() whiteboard: IWhiteboard,
    @Loader(ProfileLoaderCreator, { parentClassRef: Whiteboard })
    loader: ILoader<IProfile>
  ): Promise<IProfile> {
    return loader.load(whiteboard.id);
  }
}
