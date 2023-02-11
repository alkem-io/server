import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
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
import { LoggerService } from '@nestjs/common/services/logger.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject } from '@nestjs/common';

@Resolver(() => ICanvas)
export class CanvasResolverFields {
  constructor(
    private canvasService: CanvasService,
    private userService: UserService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @ResolveField('createdBy', () => IUser, {
    nullable: true,
    description: 'The user that created this Canvas',
  })
  async createdBy(@Parent() canvas: ICanvas): Promise<IUser | undefined> {
    const createdBy = canvas.createdBy;
    if (!createdBy) {
      throw new EntityNotInitializedException(
        `CreatedBy not set on Canvas with id ${canvas.id}`,
        LogContext.COLLABORATION
      );
    }
    try {
      return await this.userService.getUserOrFail(createdBy);
    } catch (error) {
      this.logger.warn(
        `Unable to resolve user: ${createdBy}`,
        LogContext.COLLABORATION
      );
      return undefined;
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
