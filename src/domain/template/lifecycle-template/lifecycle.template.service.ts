import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LifecycleTemplate } from './lifecycle.template.entity';
import { ILifecycleTemplate } from './lifecycle.template.interface';
import { TemplateBaseService } from '../template-base/template.base.service';
import { CreateLifecycleTemplateInput } from './dto/lifecycle.template.dto.create';
import { UpdateLifecycleTemplateInput } from './dto/lifecycle.template.dto.update';

@Injectable()
export class LifecycleTemplateService {
  constructor(
    @InjectRepository(LifecycleTemplate)
    private lifecycleTemplateRepository: Repository<LifecycleTemplate>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private templateBaseService: TemplateBaseService
  ) {}

  async createLifecycleTemplate(
    lifecycleTemplateData: CreateLifecycleTemplateInput
  ): Promise<ILifecycleTemplate> {
    const lifecycleTemplate: ILifecycleTemplate = LifecycleTemplate.create(
      lifecycleTemplateData
    );
    await this.templateBaseService.initialise(
      lifecycleTemplate,
      lifecycleTemplateData
    );

    return await this.lifecycleTemplateRepository.save(lifecycleTemplate);
  }

  async getLifecycleTemplateOrFail(
    lifecycleTemplateID: string
  ): Promise<ILifecycleTemplate> {
    const lifecycleTemplate = await this.lifecycleTemplateRepository.findOne({
      id: lifecycleTemplateID,
    });
    if (!lifecycleTemplate)
      throw new EntityNotFoundException(
        `Not able to locate LifecycleTemplate with the specified ID: ${lifecycleTemplateID}`,
        LogContext.COMMUNICATION
      );
    return lifecycleTemplate;
  }

  async updateLifecycleTemplate(
    lifecycleTemplate: ILifecycleTemplate,
    lifecycleTemplateData: UpdateLifecycleTemplateInput
  ): Promise<ILifecycleTemplate> {
    await this.templateBaseService.updateTemplateBase(
      lifecycleTemplate,
      lifecycleTemplateData
    );
    if (lifecycleTemplateData.type) {
      lifecycleTemplate.type = lifecycleTemplateData.type;
    }
    if (lifecycleTemplateData.definition) {
      lifecycleTemplate.definition = lifecycleTemplateData.definition;
    }

    return await this.lifecycleTemplateRepository.save(lifecycleTemplate);
  }

  async deleteLifecycleTemplate(
    lifecycleTemplate: ILifecycleTemplate
  ): Promise<ILifecycleTemplate> {
    const templateId: string = lifecycleTemplate.id;
    await this.templateBaseService.deleteEntities(lifecycleTemplate);
    const result = await this.lifecycleTemplateRepository.remove(
      lifecycleTemplate as LifecycleTemplate
    );
    result.id = templateId;
    return result;
  }

  async save(
    lifecycleTemplate: ILifecycleTemplate
  ): Promise<ILifecycleTemplate> {
    return await this.lifecycleTemplateRepository.save(lifecycleTemplate);
  }
}
