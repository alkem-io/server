import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { TemplatesSet } from './templates.set.entity';
import { ITemplatesSet } from './templates.set.interface';
import { TemplateService } from '../template/template.service';
import { ITemplate } from '../template/template.interface';
import { CreateTemplateInput } from '../template/dto/template.dto.create';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { TemplateType } from '@common/enums/template.type';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { CreateTemplateFromCollaborationOnTemplatesSetInput } from './dto/templates.set.dto.create.template.from.collaboration';
import { ICollaboration } from '@domain/collaboration/collaboration';
import { InputCreatorService } from '@services/api/input-creator/input.creator.service';

@Injectable()
export class TemplatesSetService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(TemplatesSet)
    private templatesSetRepository: Repository<TemplatesSet>,
    private storageAggregatorResolverService: StorageAggregatorResolverService,
    private templateService: TemplateService,
    private namingService: NamingService,
    private inputCreatorService: InputCreatorService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createTemplatesSet(): Promise<ITemplatesSet> {
    const templatesSet: ITemplatesSet = TemplatesSet.create();
    templatesSet.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.TEMPLATES_SET
    );
    templatesSet.templates = [];

    return await this.templatesSetRepository.save(templatesSet);
  }

  async getTemplatesSetOrFail(
    templatesSetID: string,
    options?: FindOneOptions<TemplatesSet>
  ): Promise<ITemplatesSet | never> {
    const templatesSet = await TemplatesSet.findOne({
      where: { id: templatesSetID },
      ...options,
    });
    if (!templatesSet)
      throw new EntityNotFoundException(
        `TemplatesSet with id(${templatesSetID}) not found!`,
        LogContext.TEMPLATES
      );
    return templatesSet;
  }

  async deleteTemplatesSet(templatesSetID: string): Promise<ITemplatesSet> {
    const templatesSet = await this.getTemplatesSetOrFail(templatesSetID, {
      relations: {
        authorization: true,
        templates: true,
      },
    });

    if (templatesSet.authorization)
      await this.authorizationPolicyService.delete(templatesSet.authorization);

    if (templatesSet.templates) {
      for (const template of templatesSet.templates) {
        await this.templateService.delete(template);
      }
    }

    return await this.templatesSetRepository.remove(
      templatesSet as TemplatesSet
    );
  }

  public getTemplate(
    templateId: string,
    templatesSetId: string
  ): Promise<ITemplate> {
    return this.templateService.getTemplateOrFail(templateId, {
      where: { templatesSet: { id: templatesSetId } },
      relations: { templatesSet: true, profile: true },
    });
  }

  public getTemplates(templatesSet: ITemplatesSet): Promise<ITemplate[]> {
    return this.templateService.getTemplatesInTemplatesSet(templatesSet.id);
  }

  public getTemplatesOfType(
    templatesSet: ITemplatesSet,
    templateType: TemplateType
  ): Promise<ITemplate[]> {
    return this.templateService.getTemplateTypeInTemplatesSet(
      templatesSet.id,
      templateType
    );
  }

  async createTemplate(
    templatesSet: ITemplatesSet,
    templateInput: CreateTemplateInput
  ): Promise<ITemplate> {
    const reservedNameIDs =
      await this.namingService.getReservedNameIDsInTemplatesSet(
        templatesSet.id
      );

    if (templateInput.nameID && templateInput.nameID.length > 0) {
      if (reservedNameIDs.includes(templateInput.nameID)) {
        throw new ValidationException(
          `Unable to create Template: the provided nameID is already taken: ${templateInput.nameID}`,
          LogContext.SPACES
        );
      }
      // Just use the provided nameID
    } else {
      templateInput.nameID =
        this.namingService.createNameIdAvoidingReservedNameIDs(
          `${templateInput.profileData.displayName}`,
          reservedNameIDs
        );
    }

    const storageAggregator = await this.getStorageAggregator(templatesSet);

    const template = await this.templateService.createTemplate(
      templateInput,
      storageAggregator
    );
    template.templatesSet = templatesSet;
    return await this.templateService.save(template);
  }

  async createTemplateFromCollaboration(
    templatesSet: ITemplatesSet,
    templateCollaborationInput: CreateTemplateFromCollaborationOnTemplatesSetInput,
    collaboration: ICollaboration
  ): Promise<ITemplate> {
    const collaborationInput =
      await this.inputCreatorService.buildCreateCollaborationInputFromCollaboration(
        collaboration
      );
    const templateInput: CreateTemplateInput = {
      ...templateCollaborationInput,
      collaborationData: collaborationInput,
    };
    return await this.createTemplate(templatesSet, templateInput);
  }

  async addTemplates(
    templatesSet: ITemplatesSet,
    templateInputs: CreateTemplateInput[],
    innovationFlowTemplateInputs: CreateTemplateInput[],
    storageAggregator: IStorageAggregator
  ): Promise<ITemplatesSet> {
    for (const templateDefault of templateInputs) {
      const template = await this.templateService.createTemplate(
        templateDefault,
        storageAggregator
      );
      templatesSet.templates.push(template);
    }

    for (const innovationFlowTemplateDefault of innovationFlowTemplateInputs) {
      const innovationFlowTemplate = await this.templateService.createTemplate(
        innovationFlowTemplateDefault,
        storageAggregator
      );
      templatesSet.templates.push(innovationFlowTemplate);
    }
    return await this.save(templatesSet);
  }

  private async getStorageAggregator(
    templatesSet: ITemplatesSet
  ): Promise<IStorageAggregator> {
    return await this.storageAggregatorResolverService.getStorageAggregatorForTemplatesSet(
      templatesSet.id
    );
  }

  public async save(templatesSet: ITemplatesSet): Promise<ITemplatesSet> {
    return await this.templatesSetRepository.save(templatesSet);
  }

  async getTemplatesCountForType(
    templatesSetID: string,
    type: TemplateType
  ): Promise<number> {
    return await this.templateService.getCountInTemplatesSet(
      templatesSetID,
      type
    );
  }

  async getTemplatesCount(templatesSetID: string): Promise<number> {
    const whiteboardTemplatesCount =
      await this.templateService.getCountInTemplatesSet(
        templatesSetID,
        TemplateType.WHITEBOARD
      );

    const postTemplatesCount =
      await this.templateService.getCountInTemplatesSet(
        templatesSetID,
        TemplateType.POST
      );

    const innovationFlowsCount =
      await this.templateService.getCountInTemplatesSet(
        templatesSetID,
        TemplateType.INNOVATION_FLOW
      );

    const calloutTemplatesCount =
      await this.templateService.getCountInTemplatesSet(
        templatesSetID,
        TemplateType.CALLOUT
      );

    const communityGuidelinesTemplatesCount =
      await this.templateService.getCountInTemplatesSet(
        templatesSetID,
        TemplateType.COMMUNITY_GUIDELINES
      );

    return (
      whiteboardTemplatesCount +
      postTemplatesCount +
      innovationFlowsCount +
      calloutTemplatesCount +
      communityGuidelinesTemplatesCount
    );
  }
}
