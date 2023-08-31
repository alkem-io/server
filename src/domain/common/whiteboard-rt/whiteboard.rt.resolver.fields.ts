import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Profiling } from '@src/common/decorators';
import { UseGuards } from '@nestjs/common/decorators/core/use-guards.decorator';
import { GraphqlGuard } from '@src/core/authorization/graphql.guard';
import { IUser } from '@domain/community/user/user.interface';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions';
import { Loader } from '@core/dataloader/decorators';
import { IProfile } from '../profile/profile.interface';
import { IWhiteboardRt } from './whiteboard.rt.interface';
import {
  ProfileLoaderCreator,
  UserLoaderCreator,
} from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { WhiteboardRt } from './whiteboard.rt.entity';
import { WhiteboardRtService } from './whiteboard.rt.service';

@Resolver(() => IWhiteboardRt)
export class WhiteboardRtResolverFields {
  constructor(
    private whiteboardRtService: WhiteboardRtService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @ResolveField('createdBy', () => IUser, {
    nullable: true,
    description: 'The user that created this WhiteboardRt',
  })
  async createdBy(
    @Parent() whiteboardRt: IWhiteboardRt,
    @Loader(UserLoaderCreator, { resolveToNull: true }) loader: ILoader<IUser>
  ): Promise<IUser | null> {
    const createdBy = whiteboardRt.createdBy;
    if (!createdBy) {
      throw new EntityNotInitializedException(
        `CreatedBy not set on WhiteboardRt with id ${whiteboardRt.id}`,
        LogContext.COLLABORATION
      );
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
          `createdBy '${createdBy}' unable to be resolved when resolving whiteboardRt '${whiteboardRt.id}'`,
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
    description: 'The Profile for this WhiteboardRt.',
  })
  @Profiling.api
  async profile(
    @Parent() whiteboardRt: IWhiteboardRt,
    @Loader(ProfileLoaderCreator, { parentClassRef: WhiteboardRt })
    loader: ILoader<IProfile>
  ): Promise<IProfile> {
    return loader.load(whiteboardRt.id);
  }
}
