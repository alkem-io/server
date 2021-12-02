import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { Canvas } from './canvas.entity';
import { ICanvas } from './canvas.interface';
import { UpdateCanvasInput } from './canvas.dto.update';
import { CreateCanvasInput } from './canvas.dto.create';
import { AuthorizationPolicy } from '../authorization-policy/authorization.policy.entity';
import { CanvasCheckoutService } from '../canvas-checkout/canvas.checkout.service';

@Injectable()
export class CanvasService {
  constructor(
    @InjectRepository(Canvas)
    private canvasRepository: Repository<Canvas>,
    private canvasCheckoutService: CanvasCheckoutService
  ) {}

  async createCanvas(canvasData: CreateCanvasInput): Promise<ICanvas> {
    const canvas: ICanvas = Canvas.create(canvasData);
    canvas.authorization = new AuthorizationPolicy();
    canvas.checkout = await this.canvasCheckoutService.createCanvasCheckout();

    return await this.save(canvas);
  }

  async getCanvasOrFail(canvasID: string): Promise<ICanvas> {
    const canvas = await this.canvasRepository.findOne({
      id: canvasID,
    });
    if (!canvas)
      throw new EntityNotFoundException(
        `Not able to locate Canvas with the specified ID: ${canvasID}`,
        LogContext.CHALLENGES
      );
    return canvas;
  }

  async deleteCanvas(canvasID: string): Promise<ICanvas> {
    const canvas = await this.getCanvasOrFail(canvasID);
    return await this.canvasRepository.remove(canvas as Canvas);
  }

  updateCanvas(
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
    return canvas;
  }

  async save(canvas: ICanvas): Promise<ICanvas> {
    return await this.canvasRepository.save(canvas);
  }
}
