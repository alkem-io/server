import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOneOptions, EntityManager } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { LifecycleTemplate } from '@domain/template/lifecycle-template/lifecycle.template.entity';
import { ILifecycleTemplate } from '@domain/template/lifecycle-template/lifecycle.template.interface';
import { TemplateBaseService } from '@domain/template/template-base/template.base.service';
import { CreateInnovationFlowTemplateInput } from '@domain/template/lifecycle-template/dto/lifecycle.template.dto.create';
import { UpdateLifecycleTemplateInput } from '@domain/template/lifecycle-template/dto/lifecycle.template.dto.update';
import { LifecycleType } from '@common/enums/lifecycle.type';
import { ILifecycleDefinition } from '@interfaces/lifecycle.definition.interface';

@Injectable()
export class LifecycleTemplateService {
  constructor(
    @InjectRepository(LifecycleTemplate)
    private lifecycleTemplateRepository: Repository<LifecycleTemplate>,
    private templateBaseService: TemplateBaseService,
    @InjectEntityManager('default')
    private entityManager: EntityManager
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
    lifecycleTemplateID: string,
    options?: FindOneOptions<LifecycleTemplate>
  ): Promise<ILifecycleTemplate | never> {
    const lifecycleTemplate = await this.lifecycleTemplateRepository.findOne({
      where: { id: lifecycleTemplateID },
      ...options,
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

  public async getLifecycleDefinitionFromTemplate(
    templateID: string,
    hubID: string,
    templateType: LifecycleType
  ): Promise<ILifecycleDefinition> {
    await this.validateLifecycleDefinitionOrFail(
      templateID,
      hubID,
      templateType
    );
    const lifecycleTemplate = await this.getLifecycleTemplateOrFail(templateID);
    if (!lifecycleTemplate.definition) {
      throw new EntityNotFoundException(
        `Lifecycle Template with ID: ${templateID}: definition is not set`,
        LogContext.LIFECYCLE
      );
    }
    return JSON.parse(lifecycleTemplate.definition);
  }

  public async getDefaultLifecycleTemplateId(
    hubID: string,
    templateType: LifecycleType
  ): Promise<string> {
    const [{ lifecycleTemplateId }]: {
      lifecycleTemplateId: string;
    }[] = await this.entityManager.connection.query(
      `
      SELECT lifecycle_template.id AS lifecycleTemplateId FROM hub
      LEFT JOIN lifecycle_template ON hub.templatesSetId = lifecycle_template.templatesSetId
      WHERE lifecycle_template.type = '${templateType}'
      AND hub.id = '${hubID}'
      LIMIT 1
      `
    );

    if (!lifecycleTemplateId) {
      throw new EntityNotFoundException(
        `Not able to locate LifecycleTemplate with type: ${templateType} for Hub: ${hubID}`,
        LogContext.COMMUNICATION
      );
    }

    return lifecycleTemplateId;
  }

  async validateLifecycleDefinitionOrFail(
    templateID: string,
    hubID: string,
    templateType: LifecycleType
  ): Promise<void> {
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
  }

  private async isLifecycleTemplateInHub(
    lifecycleTemplateID: string,
    hubID: string,
    templateType: string
  ) {
    const [queryResult]: {
      hubCount: string;
    }[] = await this.entityManager.connection.query(
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
}
