import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { Canvas } from './canvas.entity';
import { ICanvas } from './canvas.interface';
import { CreateCanvasInput } from './dto/canvas.dto.create';
import { AuthorizationPolicy } from '../authorization-policy/authorization.policy.entity';
import { CanvasCheckoutService } from '../canvas-checkout/canvas.checkout.service';
import { UpdateCanvasInput } from './dto/canvas.dto.update';
import { ICanvasCheckout } from '../canvas-checkout/canvas.checkout.interface';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { AgentInfo } from '@core/authentication';
import { CanvasCheckoutStateEnum } from '@common/enums/canvas.checkout.status';
import { EntityCheckoutStatusException } from '@common/exceptions/entity.not.checkedout.exception';

@Injectable()
export class CanvasService {
  constructor(
    @InjectRepository(Canvas)
    private canvasRepository: Repository<Canvas>,
    private canvasCheckoutService: CanvasCheckoutService,
    private authorizationPolicyService: AuthorizationPolicyService
  ) {}

  async createCanvas(canvasData: CreateCanvasInput): Promise<ICanvas> {
    const canvas: ICanvas = Canvas.create(canvasData);
    canvas.authorization = new AuthorizationPolicy();

    // get the id assigned
    const savedCanvas = await this.save(canvas);

    canvas.checkout = await this.canvasCheckoutService.createCanvasCheckout({
      canvasID: savedCanvas.id,
    });
    return await this.save(canvas);
  }

  async getCanvasOrFail(
    canvasID: string,
    options?: FindOneOptions<Canvas>
  ): Promise<ICanvas> {
    const canvas = await this.canvasRepository.findOne(
      {
        id: canvasID,
      },
      options
    );
    if (!canvas)
      throw new EntityNotFoundException(
        `Not able to locate Canvas with the specified ID: ${canvasID}`,
        LogContext.CHALLENGES
      );
    return canvas;
  }

  async deleteCanvas(canvasID: string): Promise<ICanvas> {
    const canvas = await this.getCanvasOrFail(canvasID, {
      relations: ['checkout'],
    });

    if (canvas.checkout) {
      await this.canvasCheckoutService.delete(canvas.checkout.id);
    }

    if (canvas.authorization) {
      await this.authorizationPolicyService.delete(canvas.authorization);
    }

    const deletedCanvas = await this.canvasRepository.remove(canvas as Canvas);
    deletedCanvas.id = canvasID;
    return deletedCanvas;
  }

  async updateCanvas(
    canvas: ICanvas,
    updateCanvasData: UpdateCanvasInput,
    agentInfo: AgentInfo
  ): Promise<ICanvas> {
    const checkout = await this.getCanvasCheckout(canvas);

    // Before updating the canvas contents check the user doing it has it checked out
    if (updateCanvasData.value && updateCanvasData.value !== canvas.value) {
      await this.canvasCheckoutService.isUpdateAllowedOrFail(
        checkout,
        agentInfo
      );
    }
    // Only allow saving as a template if checked in
    if (updateCanvasData.isTemplate && !canvas.isTemplate) {
      const status = this.canvasCheckoutService.getCanvasStatus(checkout);
      if (status !== CanvasCheckoutStateEnum.AVAILABLE) {
        throw new EntityCheckoutStatusException(
          `Unable to convert Canvas to being a Template as it is not checkedin: ${status}`,
          LogContext.CONTEXT
        );
      }
    }
    const updatedCanvas = this.updateCanvasEntity(canvas, updateCanvasData);
    return await this.save(updatedCanvas);
  }

  updateCanvasEntity(
    canvas: ICanvas | undefined,
    updateCanvasData: UpdateCanvasInput
  ): ICanvas {
    if (!canvas)
      throw new EntityNotFoundException(
        'No Canvas loaded',
        LogContext.CHALLENGES
      );
    if (updateCanvasData.name) canvas.name = updateCanvasData.name;
    if (updateCanvasData.value) canvas.value = updateCanvasData.value;
    if (updateCanvasData.isTemplate !== undefined)
      canvas.isTemplate = updateCanvasData.isTemplate;
    return canvas;
  }

  async save(canvas: ICanvas): Promise<ICanvas> {
    return await this.canvasRepository.save(canvas);
  }

  async getCanvasCheckout(canvas: ICanvas): Promise<ICanvasCheckout> {
    const canvasWithCheckout = await this.getCanvasOrFail(canvas.id, {
      relations: ['checkout'],
    });

    // Note: this is done the same as with organizationVerification, i.e. that
    // we create the entity wrapping a lifecycle if it is not present.
    // This is due to lifecycles being difficult to deal with via migraitons.
    // Needs further discussion.
    if (!canvasWithCheckout.checkout) {
      // create and add the checkout
      canvas.checkout = await this.canvasCheckoutService.createCanvasCheckout({
        canvasID: canvas.id,
      });

      await this.save(canvas);
    }

    if (!canvasWithCheckout.checkout)
      throw new EntityNotFoundException(
        `Canvas not initialised, no checkout: ${canvas.id}`,
        LogContext.CONTEXT
      );

    return canvasWithCheckout.checkout;
  }
}
