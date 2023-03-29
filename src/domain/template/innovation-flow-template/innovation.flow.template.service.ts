import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOneOptions, EntityManager } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { TemplateBaseService } from '@domain/template/template-base/template.base.service';
import { CreateInnovationFlowTemplateInput } from './dto/innovation.flow.template.dto.create';
import { InnovationFlowTemplate } from './innovation.flow.template.entity';
import { IInnovationFlowTemplate } from './innovation.flow.template.interface';
import { UpdateInnovationFlowTemplateInput } from './dto/innovation.flow.template.dto.update';
import { InnovationFlowType } from '@common/enums/innovation.flow.type';
import { ILifecycleDefinition } from '@interfaces/lifecycle.definition.interface';

@Injectable()
export class InnovationFlowTemplateService {
  constructor(
    @InjectRepository(InnovationFlowTemplate)
    private innovationFlowTemplateRepository: Repository<InnovationFlowTemplate>,
    private templateBaseService: TemplateBaseService,
    @InjectEntityManager('default')
    private entityManager: EntityManager
  ) {}

  async createInnovationFLowTemplate(
    innovationFlowTemplateData: CreateInnovationFlowTemplateInput
  ): Promise<IInnovationFlowTemplate> {
    const innovationFlowTemplate: IInnovationFlowTemplate =
      InnovationFlowTemplate.create(innovationFlowTemplateData);
    await this.templateBaseService.initialise(
      innovationFlowTemplate,
      innovationFlowTemplateData
    );

    return await this.innovationFlowTemplateRepository.save(
      innovationFlowTemplate
    );
  }

  async getInnovationFlowTemplateOrFail(
    innovationFlowTemplateID: string,
    options?: FindOneOptions<InnovationFlowTemplate>
  ): Promise<IInnovationFlowTemplate | never> {
    const innovationFlowTemplate =
      await this.innovationFlowTemplateRepository.findOne({
        where: { id: innovationFlowTemplateID },
        ...options,
      });

    if (!innovationFlowTemplate)
      throw new EntityNotFoundException(
        `Not able to locate InnovationFlowTemplate with the specified ID: ${innovationFlowTemplateID}`,
        LogContext.COMMUNICATION
      );
    return innovationFlowTemplate;
  }

  async updateInnovationFlowTemplate(
    innovationFlowTemplateInput: IInnovationFlowTemplate,
    innovationFlowTemplateData: UpdateInnovationFlowTemplateInput
  ): Promise<IInnovationFlowTemplate> {
    const innovationFlowTemplate = await this.getInnovationFlowTemplateOrFail(
      innovationFlowTemplateInput.id,
      {
        relations: ['profile'],
      }
    );
    await this.templateBaseService.updateTemplateBase(
      innovationFlowTemplate,
      innovationFlowTemplateData
    );
    if (innovationFlowTemplateData.definition) {
      innovationFlowTemplate.definition = innovationFlowTemplateData.definition;
    }

    return await this.innovationFlowTemplateRepository.save(
      innovationFlowTemplate
    );
  }

  async deleteInnovationFlowTemplate(
    innovationFlowTemplateInput: IInnovationFlowTemplate
  ): Promise<IInnovationFlowTemplate> {
    const innovationFlowTemplate = await this.getInnovationFlowTemplateOrFail(
      innovationFlowTemplateInput.id,
      {
        relations: ['profile'],
      }
    );
    const templateId: string = innovationFlowTemplate.id;
    await this.templateBaseService.deleteEntities(innovationFlowTemplate);
    const result = await this.innovationFlowTemplateRepository.remove(
      innovationFlowTemplate as InnovationFlowTemplate
    );
    result.id = templateId;
    return result;
  }

  async save(
    innovationFlowTemplate: IInnovationFlowTemplate
  ): Promise<IInnovationFlowTemplate> {
    return await this.innovationFlowTemplateRepository.save(
      innovationFlowTemplate
    );
  }

  public async getInnovationFlowDefinitionFromTemplate(
    templateID: string,
    hubID: string,
    templateType: InnovationFlowType
  ): Promise<ILifecycleDefinition> {
    await this.validateInnovationFlowDefinitionOrFail(
      templateID,
      hubID,
      templateType
    );
    const innovationFlowTemplate = await this.getInnovationFlowTemplateOrFail(
      templateID
    );
    if (!innovationFlowTemplate.definition) {
      throw new EntityNotFoundException(
        `InnovationFlow Template with ID: ${templateID}: definition is not set`,
        LogContext.LIFECYCLE
      );
    }
    return JSON.parse(innovationFlowTemplate.definition);
  }

  public async getDefaultInnovationFlowTemplateId(
    hubID: string,
    templateType: InnovationFlowType
  ): Promise<string> {
    const [{ innovationFlowTemplateId }]: {
      innovationFlowTemplateId: string;
    }[] = await this.entityManager.connection.query(
      `
      SELECT innovationFlow_template.id AS innovationFlowTemplateId FROM hub
      LEFT JOIN innovationFlow_template ON hub.templatesSetId = innovationFlow_template.templatesSetId
      WHERE innovationFlow_template.type = '${templateType}'
      AND hub.id = '${hubID}'
      LIMIT 1
      `
    );

    if (!innovationFlowTemplateId) {
      throw new EntityNotFoundException(
        `Not able to locate InnovationFlowTemplate with type: ${templateType} for Hub: ${hubID}`,
        LogContext.COMMUNICATION
      );
    }

    return innovationFlowTemplateId;
  }

  async validateInnovationFlowDefinitionOrFail(
    templateID: string,
    hubID: string,
    templateType: InnovationFlowType
  ): Promise<void> {
    const isInnovationFlowTemplateAvailable =
      await this.isInnovationFlowTemplateInHub(templateID, hubID, templateType);
    if (!isInnovationFlowTemplateAvailable) {
      throw new EntityNotFoundException(
        `Unable to find ${templateType} InnovationFlow Template with ID: ${templateID}, in parent Hub template set.`,
        LogContext.LIFECYCLE
      );
    }
  }

  private async isInnovationFlowTemplateInHub(
    innovationFlowTemplateID: string,
    hubID: string,
    templateType: string
  ) {
    const [queryResult]: {
      hubCount: string;
    }[] = await this.entityManager.connection.query(
      `
      SELECT COUNT(*) as hubCount FROM \`hub\`
      RIGHT JOIN \`innovationFlow_template\` ON \`hub\`.\`templatesSetId\` = \`innovationFlow_template\`.\`templatesSetId\`
      WHERE \`innovationFlow_template\`.\`id\` = '${innovationFlowTemplateID}'
      AND \`innovationFlow_template\`.\`type\` = '${templateType}'
      AND \`hub\`.\`id\` = '${hubID}'
      `
    );

    return queryResult.hubCount === '1';
  }
}
