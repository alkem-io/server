import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Profiling } from '@src/common/decorators';
import { ICanvasCheckout } from '../canvas-checkout/canvas.checkout.interface';
import { ICanvas } from './canvas.interface';
import { UseGuards } from '@nestjs/common/decorators/core/use-guards.decorator';
import { GraphqlGuard } from '@src/core/authorization/graphql.guard';
import { IUser } from '@domain/community/user/user.interface';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions';
import { IProfile } from '../profile/profile.interface';
import { Loader } from '@core/dataloader/decorators';
import {
  CheckoutLoaderCreator,
  UserLoaderCreator,
} from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { Canvas } from '@domain/common/canvas/canvas.entity';
import { CanvasService } from './canvas.service';

@Resolver(() => ICanvas)
export class CanvasResolverFields {
  constructor(
    private canvasService: CanvasService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @ResolveField('createdBy', () => IUser, {
    nullable: true,
    description: 'The user that created this Canvas',
  })
  async createdBy(
    @Parent() canvas: ICanvas,
    @Loader(UserLoaderCreator, { resolveToNull: true }) loader: ILoader<IUser>
  ): Promise<IUser | null> {
    const createdBy = canvas.createdBy;
    if (!createdBy) {
      throw new EntityNotInitializedException(
        `CreatedBy not set on Canvas with id ${canvas.id}`,
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
          `createdBy '${createdBy}' unable to be resolved when resolving canvas '${canvas.id}'`,
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
    description: 'The Profile for this Canvas.',
  })
  @Profiling.api
  async profile(@Parent() canvas: ICanvas): Promise<IProfile> {
    return await this.canvasService.getProfile(canvas);
  }

  @ResolveField('checkout', () => ICanvasCheckout, {
    nullable: true,
    description: 'The checkout out state of this Canvas.',
  })
  @Profiling.api
  async checkout(
    @Parent() canvas: ICanvas,
    @Loader(CheckoutLoaderCreator, { parentClassRef: Canvas })
    loader: ILoader<ICanvasCheckout>
  ) {
    return loader.load(canvas.id);
  }
}
