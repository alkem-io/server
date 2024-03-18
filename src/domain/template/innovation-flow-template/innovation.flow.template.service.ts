import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOneOptions } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext, ProfileType } from '@common/enums';
import { TemplateBaseService } from '@domain/template/template-base/template.base.service';
import { CreateInnovationFlowTemplateInput } from './dto/innovation.flow.template.dto.create';
import { InnovationFlowTemplate } from './innovation.flow.template.entity';
import { IInnovationFlowTemplate } from './innovation.flow.template.interface';
import { UpdateInnovationFlowTemplateInput } from './dto/innovation.flow.template.dto.update';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { InnovationFlowStatesService } from '@domain/collaboration/innovation-flow-states/innovaton.flow.state.service';
import { IInnovationFlowState } from '@domain/collaboration/innovation-flow-states/innovation.flow.state.interface';

@Injectable()
export class InnovationFlowTemplateService {
  constructor(
    @InjectRepository(InnovationFlowTemplate)
    private innovationFlowTemplateRepository: Repository<InnovationFlowTemplate>,
    private innovationFlowStatesService: InnovationFlowStatesService,
    private templateBaseService: TemplateBaseService
  ) {}

  async createInnovationFLowTemplate(
    innovationFlowTemplateData: CreateInnovationFlowTemplateInput,
    storageAggregator: IStorageAggregator
  ): Promise<IInnovationFlowTemplate> {
    this.innovationFlowStatesService.validateDefinition(
      innovationFlowTemplateData.states
    );
    const innovationFlowTemplate: IInnovationFlowTemplate =
      new InnovationFlowTemplate();
    await this.templateBaseService.initialise(
      innovationFlowTemplate,
      innovationFlowTemplateData,
      ProfileType.INNOVATION_FLOW_TEMPLATE,
      storageAggregator
    );

    innovationFlowTemplate.states =
      this.innovationFlowStatesService.serializeStates(
        innovationFlowTemplateData.states
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
        relations: { profile: true },
      }
    );
    await this.templateBaseService.updateTemplateBase(
      innovationFlowTemplate,
      innovationFlowTemplateData
    );
    if (innovationFlowTemplateData.states) {
      this.innovationFlowStatesService.validateDefinition(
        innovationFlowTemplateData.states
      );
      innovationFlowTemplate.states =
        this.innovationFlowStatesService.serializeStates(
          innovationFlowTemplateData.states
        );
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
        relations: { profile: true },
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

  async getCountInTemplatesSet(templatesSetID: string): Promise<number> {
    return await this.innovationFlowTemplateRepository.countBy({
      templatesSet: {
        id: templatesSetID,
      },
    });
  }

  public getStates(
    innovationFlowTemplate: IInnovationFlowTemplate
  ): IInnovationFlowState[] {
    return this.innovationFlowStatesService.getStates(
      innovationFlowTemplate.states
    );
  }
}
