import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { NVP } from '@domain/common/nvp';
import { Canvas } from './canvas.entity';
import { ICanvas } from './canvas.interface';
import { UpdateCanvasInput } from './canvas.dto.update';

@Injectable()
export class CanvasService {
  constructor(
    @InjectRepository(Canvas)
    private canvasRepository: Repository<Canvas>
  ) {}

  async getCanvasOrFail(canvasID: string): Promise<NVP> {
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
}
