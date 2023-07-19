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
    spaceID: string,
    templateType: InnovationFlowType
  ): Promise<ILifecycleDefinition> {
    await this.validateInnovationFlowDefinitionOrFail(
      templateID,
      spaceID,
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
    spaceID: string,
    templateType: InnovationFlowType
  ): Promise<string> {
    const [{ innovationFlowTemplateId }]: {
      innovationFlowTemplateId: string;
    }[] = await this.entityManager.connection.query(
      `
      SELECT innovation_flow_template.id AS innovationFlowTemplateId FROM space
      LEFT JOIN innovation_flow_template ON space.templatesSetId = innovation_flow_template.templatesSetId
      WHERE innovation_flow_template.type = '${templateType}'
      AND space.id = '${spaceID}'
      LIMIT 1
      `
    );

    if (!innovationFlowTemplateId) {
      throw new EntityNotFoundException(
        `Not able to locate InnovationFlowTemplate with type: ${templateType} for Space: ${spaceID}`,
        LogContext.COMMUNICATION
      );
    }

    return innovationFlowTemplateId;
  }

  async validateInnovationFlowDefinitionOrFail(
    templateID: string,
    spaceID: string,
    templateType: InnovationFlowType
  ): Promise<void> {
    const isInnovationFlowTemplateAvailable =
      await this.isInnovationFlowTemplateInSpace(
        templateID,
        spaceID,
        templateType
      );
    if (!isInnovationFlowTemplateAvailable) {
      throw new EntityNotFoundException(
        `Unable to find ${templateType} InnovationFlow Template with ID: ${templateID}, in parent Space template set.`,
        LogContext.LIFECYCLE
      );
    }
  }

  private async isInnovationFlowTemplateInSpace(
    innovationFlowTemplateID: string,
    spaceID: string,
    templateType: string
  ) {
    const [queryResult]: {
      spaceCount: string;
    }[] = await this.entityManager.connection.query(
      `
      SELECT COUNT(*) as spaceCount FROM \`space\`
      RIGHT JOIN \`innovation_flow_template\` ON \`space\`.\`templatesSetId\` = \`innovation_flow_template\`.\`templatesSetId\`
      WHERE \`innovation_flow_template\`.\`id\` = '${innovationFlowTemplateID}'
      AND \`innovation_flow_template\`.\`type\` = '${templateType}'
      AND \`space\`.\`id\` = '${spaceID}'
      `
    );

    return queryResult.spaceCount === '1';
  }

  async getCountInTemplatesSet(templatesSetID: string): Promise<number> {
    return await this.innovationFlowTemplateRepository.countBy({
      templatesSet: {
        id: templatesSetID,
      },
    });
  }
}
