import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CanvasTemplate } from './canvas.template.entity';
import { ICanvasTemplate } from './canvas.template.interface';
import { TemplateBaseService } from '../template-base/template.base.service';
import { CreateCanvasTemplateInput } from './dto/canvas.template.dto.create';
import { UpdateCanvasTemplateInput } from './dto/canvas.template.dto.update';
import { CanvasService } from '@domain/common/canvas/canvas.service';

@Injectable()
export class CanvasTemplateService {
  constructor(
    @InjectRepository(CanvasTemplate)
    private canvasTemplateRepository: Repository<CanvasTemplate>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private templateBaseService: TemplateBaseService,
    private canvasService: CanvasService
  ) {}

  async createCanvasTemplate(
    canvasTemplateData: CreateCanvasTemplateInput
  ): Promise<ICanvasTemplate> {
    const canvasTemplate: ICanvasTemplate =
      CanvasTemplate.create(canvasTemplateData);
    const result: ICanvasTemplate = await this.templateBaseService.initialise(
      canvasTemplate,
      canvasTemplateData
    );

    // Allow specifying a Canvas to use as a base if no value is set
    if (!canvasTemplateData.value && canvasTemplateData.canvasID) {
      const canvas = await this.canvasService.getCanvasOrFail(
        canvasTemplateData.canvasID
      );
      result.value = canvas.value;
    }

    return await this.canvasTemplateRepository.save(result);
  }

  async getCanvasTemplateOrFail(
    canvasTemplateID: string
  ): Promise<ICanvasTemplate> {
    const canvasTemplate = await this.canvasTemplateRepository.findOne({
      id: canvasTemplateID,
    });
    if (!canvasTemplate)
      throw new EntityNotFoundException(
        `Not able to locate CanvasTemplate with the specified ID: ${canvasTemplateID}`,
        LogContext.COMMUNICATION
      );
    return canvasTemplate;
  }

  async updateCanvasTemplate(
    canvasTemplate: ICanvasTemplate,
    canvasTemplateData: UpdateCanvasTemplateInput
  ): Promise<ICanvasTemplate> {
    await this.templateBaseService.updateTemplateBase(
      canvasTemplate,
      canvasTemplateData
    );
    if (canvasTemplateData.value) {
      canvasTemplate.value = canvasTemplateData.value;
    }

    return await this.canvasTemplateRepository.save(canvasTemplate);
  }

  async deleteCanvasTemplate(
    canvasTemplate: ICanvasTemplate
  ): Promise<ICanvasTemplate> {
    const canvasID = canvasTemplate.id;
    await this.templateBaseService.deleteEntities(canvasTemplate);
    const result = await this.canvasTemplateRepository.remove(
      canvasTemplate as CanvasTemplate
    );
    result.id = canvasID;
    return result;
  }

  async save(canvasTemplate: ICanvasTemplate): Promise<ICanvasTemplate> {
    return await this.canvasTemplateRepository.save(canvasTemplate);
  }
}
