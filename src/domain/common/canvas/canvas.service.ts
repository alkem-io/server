import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  NotSupportedException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { Canvas } from './canvas.entity';
import { ICanvas } from './canvas.interface';
import { CreateCanvasInput } from './dto/canvas.dto.create';
import { AuthorizationPolicy } from '../authorization-policy/authorization.policy.entity';
import { CanvasCheckoutService } from '../canvas-checkout/canvas.checkout.service';
import { UpdateCanvasInput } from './dto/canvas.dto.update';
import { CanvasCheckoutLifecycleOptionsProvider } from '../canvas-checkout/canvas.checkout.lifecycle.options.provider';

@Injectable()
export class CanvasService {
  constructor(
    @InjectRepository(Canvas)
    private canvasRepository: Repository<Canvas>,
    private canvasCheckoutService: CanvasCheckoutService,
    private canvasCheckoutLifecycleOptionsProvider: CanvasCheckoutLifecycleOptionsProvider
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
      relations: ['context'],
    });
    // check it is a canvas direction on a Context
    if (!(canvas as Canvas).context) {
      throw new NotSupportedException(
        `Not able to delete a Canvas that is not contained by Context: ${canvasID}`,
        LogContext.CHALLENGES
      );
    }
    if (canvas.checkout) {
      await this.canvasCheckoutService.delete(canvas.checkout.id);
    }
    const deletedCanvas = await this.canvasRepository.remove(canvas as Canvas);
    deletedCanvas.id = canvasID;
    return deletedCanvas;
  }

  async updateCanvas(
    canvas: ICanvas | undefined,
    updateCanvasData: UpdateCanvasInput
  ): Promise<ICanvas> {
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
}
