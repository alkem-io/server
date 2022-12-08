import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AspectTemplate } from './aspect.template.entity';
import { IAspectTemplate } from './aspect.template.interface';
import { TemplateBaseService } from '../template-base/template.base.service';
import { CreateAspectTemplateInput } from './dto/aspect.template.dto.create';
import { UpdateAspectTemplateInput } from './dto/aspect.template.dto.update';

@Injectable()
export class AspectTemplateService {
  constructor(
    @InjectRepository(AspectTemplate)
    private aspectTemplateRepository: Repository<AspectTemplate>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private templateBaseService: TemplateBaseService
  ) {}

  async createAspectTemplate(
    aspectTemplateData: CreateAspectTemplateInput
  ): Promise<IAspectTemplate> {
    const aspectTemplate: IAspectTemplate =
      AspectTemplate.create(aspectTemplateData);
    await this.templateBaseService.initialise(
      aspectTemplate,
      aspectTemplateData
    );

    return await this.aspectTemplateRepository.save(aspectTemplate);
  }

  async getAspectTemplateOrFail(
    aspectTemplateID: string,
    options?: FindOneOptions<AspectTemplate>
  ): Promise<IAspectTemplate> {
    const aspectTemplate = await this.aspectTemplateRepository.findOne(
      aspectTemplateID,
      options
    );
    if (!aspectTemplate)
      throw new EntityNotFoundException(
        `Not able to locate AspectTemplate with the specified ID: ${aspectTemplateID}`,
        LogContext.COMMUNICATION
      );
    return aspectTemplate;
  }

  async updateAspectTemplate(
    aspectTemplate: IAspectTemplate,
    aspectTemplateData: UpdateAspectTemplateInput
  ): Promise<IAspectTemplate> {
    await this.templateBaseService.updateTemplateBase(
      aspectTemplate,
      aspectTemplateData
    );
    if (aspectTemplateData.defaultDescription) {
      aspectTemplate.defaultDescription = aspectTemplateData.defaultDescription;
    }
    if (aspectTemplateData.type) {
      aspectTemplate.type = aspectTemplateData.type;
    }

    return await this.aspectTemplateRepository.save(aspectTemplate);
  }

  async deleteAspectTemplate(
    aspectTemplate: IAspectTemplate
  ): Promise<IAspectTemplate> {
    const templateId: string = aspectTemplate.id;
    await this.templateBaseService.deleteEntities(aspectTemplate);
    const result = await this.aspectTemplateRepository.remove(
      aspectTemplate as AspectTemplate
    );
    result.id = templateId;
    return result;
  }

  async save(aspectTemplate: IAspectTemplate): Promise<IAspectTemplate> {
    return await this.aspectTemplateRepository.save(aspectTemplate);
  }
}
