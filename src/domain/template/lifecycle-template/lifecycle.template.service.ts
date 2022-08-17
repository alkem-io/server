import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getConnection } from 'typeorm';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LifecycleTemplate } from './lifecycle.template.entity';
import { ILifecycleTemplate } from './lifecycle.template.interface';
import { TemplateBaseService } from '../template-base/template.base.service';
import { CreateInnovationFlowTemplateInput } from './dto/lifecycle.template.dto.create';
import { UpdateLifecycleTemplateInput } from './dto/lifecycle.template.dto.update';
import { LifecycleType } from '@common/enums/lifecycle.type';

@Injectable()
export class LifecycleTemplateService {
  constructor(
    @InjectRepository(LifecycleTemplate)
    private lifecycleTemplateRepository: Repository<LifecycleTemplate>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private templateBaseService: TemplateBaseService
  ) {}

  async createInnovationFLowTemplate(
    lifecycleTemplateData: CreateInnovationFlowTemplateInput
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
    const [queryResult]: {
      lifecycleTemplatesCount: string;
      templatesSetId: string;
    }[] = await getConnection().query(
      `
      SELECT COUNT(*) as lifecycleTemplatesCount, \`templates_set\`.\`id\` AS templatesSetId
      FROM \`templates_set\` JOIN \`lifecycle_template\`
      ON \`lifecycle_template\`.\`templatesSetId\` = \`templates_set\`.\`id\`
      WHERE \`lifecycle_template\`.\`type\`='${lifecycleTemplate.type}' AND \`templates_set\`.\`id\` =
      (SELECT \`lifecycle_template\`.\`templatesSetId\` FROM \`lifecycle_template\`
      WHERE \`lifecycle_template\`.\`id\` = '${lifecycleTemplate.id}');
      `
    );

    if (queryResult.lifecycleTemplatesCount === '1') {
      throw new ValidationException(
        `Can't delete last lifecycle template: ${lifecycleTemplate.id} of type ${lifecycleTemplate.type} from templateSet: ${queryResult.templatesSetId}!`,
        LogContext.LIFECYCLE
      );
    }
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

  public async isLifecycleTemplateInHub(
    lifecycleTemplateID: string,
    hubID: string,
    templateType: string
  ) {
    const [queryResult]: {
      hubCount: string;
    }[] = await getConnection().query(
      `
      SELECT COUNT(*) as hubCount FROM \`hub\`
      RIGHT JOIN \`lifecycle_template\` ON \`hub\`.\`templatesSetId\` = \`lifecycle_template\`.\`templatesSetId\`
      WHERE \`lifecycle_template\`.\`id\` = '${lifecycleTemplateID}'
      AND \`lifecycle_template\`.\`type\` = '${templateType}'
      AND \`hub\`.\`id\` = '${hubID}'
      `
    );

    return queryResult.hubCount === '1';
  }

  public async getLifecycleDefinitionFromTemplate(
    templateID: string,
    hubID: string,
    templateType: LifecycleType
  ) {
    const isLifecycleTemplateAvailable = await this.isLifecycleTemplateInHub(
      templateID,
      hubID,
      templateType
    );
    if (!isLifecycleTemplateAvailable) {
      throw new EntityNotFoundException(
        `Unable to find ${templateType} Lifecycle Template with ID: ${templateID}, in parent Hub template set.`,
        LogContext.LIFECYCLE
      );
    }
    const lifecycleTemplate = await this.getLifecycleTemplateOrFail(templateID);
    return JSON.parse(lifecycleTemplate.definition);
  }
}
