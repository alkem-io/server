import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Profiling } from '@src/common/decorators';
import { ICanvasCheckout } from '../canvas-checkout/canvas.checkout.interface';
import { ICanvas } from './canvas.interface';
import { CanvasService } from './canvas.service';
import { UseGuards } from '@nestjs/common/decorators/core/use-guards.decorator';
import { GraphqlGuard } from '@src/core/authorization/graphql.guard';
import { IVisual } from '@src/domain/common/visual/visual.interface';
import { IUser } from '@domain/community/user/user.interface';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { LogContext } from '@common/enums/logging.context';
import { UserService } from '@domain/community/user/user.service';
import { EntityNotFoundException } from '@common/exceptions';

@Resolver(() => ICanvas)
export class CanvasResolverFields {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private canvasService: CanvasService,
    private userService: UserService
  ) {}

  @ResolveField('createdBy', () => IUser, {
    nullable: true,
    description: 'The user that created this Canvas',
  })
  async createdBy(@Parent() canvas: ICanvas): Promise<IUser | null> {
    const createdBy = canvas.createdBy;
    if (!createdBy) {
      throw new EntityNotInitializedException(
        `CreatedBy not set on Canvas with id ${canvas.id}`,
        LogContext.COLLABORATION
      );
    }

    try {
      return await this.userService.getUserOrFail(createdBy);
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

  @ResolveField('checkout', () => ICanvasCheckout, {
    nullable: true,
    description: 'The checkout out state of this Canvas.',
  })
  @Profiling.api
  async checkout(@Parent() canvas: ICanvas) {
    return await this.canvasService.getCanvasCheckout(canvas);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('preview', () => IVisual, {
    nullable: true,
    description: 'The preview image for this Canvas.',
  })
  @Profiling.api
  async preview(@Parent() canvas: ICanvas): Promise<IVisual> {
    return await this.canvasService.getPreview(canvas);
  }
}
