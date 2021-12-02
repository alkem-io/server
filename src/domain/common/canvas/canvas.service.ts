import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { Canvas } from './canvas.entity';
import { ICanvas } from './canvas.interface';
import { CreateCanvasInput } from './dto/canvas.dto.create';
import { AuthorizationPolicy } from '../authorization-policy/authorization.policy.entity';
import { CanvasCheckoutService } from '../canvas-checkout/canvas.checkout.service';
import { UpdateCanvasInput } from './dto/canvas.dto.update';

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

    // get the id assigned
    const savedCanvas = await this.save(canvas);

    canvas.checkout = await this.canvasCheckoutService.createCanvasCheckout({
      canvasID: savedCanvas.id,
    });
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
