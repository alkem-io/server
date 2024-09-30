import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { LogContext, ProfileType } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Template } from './template.entity';
import { ITemplate } from './template.interface';
import { CreateTemplateInput } from './dto/template.dto.create';
import { UpdateTemplateInput } from './dto/template.dto.update';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { VisualType } from '@common/enums/visual.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { ProfileService } from '@domain/common/profile/profile.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { TemplateType } from '@common/enums/template.type';
import { InnovationFlowService } from '@domain/collaboration/innovation-flow/innovaton.flow.service';
import { CommunityGuidelinesService } from '@domain/community/community-guidelines/community.guidelines.service';
import { CreateCommunityGuidelinesInput } from '@domain/community/community-guidelines/dto/community.guidelines.dto.create';
import { ICommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.interface';
import { ICallout } from '@domain/collaboration/callout';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { WhiteboardService } from '@domain/common/whiteboard';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { IInnovationFlow } from '@domain/collaboration/innovation-flow/innovation.flow.interface';
import { UpdateInnovationFlowFromTemplateInput } from './dto/template.dto.update.innovation.flow';
import { randomUUID } from 'crypto';
import { ICollaboration } from '@domain/collaboration/collaboration';
import { CalloutVisibility } from '@common/enums/callout.visibility';

@Injectable()
export class TemplateService {
  constructor(
    private profileService: ProfileService,
    private innovationFlowService: InnovationFlowService,
    private communityGuidelinesService: CommunityGuidelinesService,
    private calloutService: CalloutService,
    private whiteboardService: WhiteboardService,
    @InjectRepository(Template)
    private templateRepository: Repository<Template>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async createTemplate(
    templateData: CreateTemplateInput,
    storageAggregator: IStorageAggregator
  ): Promise<ITemplate> {
    const template: ITemplate = Template.create(templateData);
    template.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.TEMPLATE
    );

    template.profile = await this.profileService.createProfile(
      templateData.profileData,
      ProfileType.TEMPLATE,
      storageAggregator
    );
    await this.profileService.addTagsetOnProfile(template.profile, {
      name: TagsetReservedName.DEFAULT,
      tags: templateData.tags,
    });
    this.profileService.addVisualOnProfile(
      template.profile,
      VisualType.CARD,
      templateData.visualUri
    );

    if (template.type === TemplateType.POST) {
      if (!templateData.postDefaultDescription) {
        throw new ValidationException(
          `Post Template requires default description input: ${JSON.stringify(templateData)}`,
          LogContext.TEMPLATES
        );
      }
      template.postDefaultDescription = templateData.postDefaultDescription;
    } else if (template.type === TemplateType.INNOVATION_FLOW) {
      if (!templateData.innovationFlowData) {
        throw new ValidationException(
          `InnovationFlow Template requires create innovation flow input: ${JSON.stringify(templateData)}`,
          LogContext.TEMPLATES
        );
      }
      template.innovationFlow =
        await this.innovationFlowService.createInnovationFlow(
          templateData.innovationFlowData,
          [],
          storageAggregator,
          true
        );
    } else if (template.type === TemplateType.COMMUNITY_GUIDELINES) {
      if (!templateData.communityGuidelinesData) {
        throw new ValidationException(
          `Community Guidelines Template requiresthe community guidelines input: ${JSON.stringify(templateData)}`,
          LogContext.TEMPLATES
        );
      }
      const guidelinesInput: CreateCommunityGuidelinesInput =
        templateData.communityGuidelinesData!;

      template.communityGuidelines =
        await this.communityGuidelinesService.createCommunityGuidelines(
          guidelinesInput,
          storageAggregator
        );
    } else if (template.type === TemplateType.CALLOUT) {
      if (!templateData.calloutData) {
        throw new ValidationException(
          `Callout Template requires callout input: ${JSON.stringify(templateData)}`,
          LogContext.TEMPLATES
        );
      }
      // Ensure no comments are created on the callout
      templateData.calloutData.enableComments = false;
      templateData.calloutData.visibility = CalloutVisibility.DRAFT;
      templateData.calloutData.isTemplate = true;
      templateData.calloutData.nameID = `template-${randomUUID().slice(0, 8)}`;
      template.callout = await this.calloutService.createCallout(
        templateData.calloutData!,
        [],
        storageAggregator
      );
    } else if (template.type === TemplateType.WHITEBOARD) {
      if (!templateData.whiteboard) {
        throw new ValidationException(
          `Whiteboard Template requires whitebboard input: ${JSON.stringify(templateData)}`,
          LogContext.TEMPLATES
        );
      }
      template.whiteboard = await this.whiteboardService.createWhiteboard(
        {
          profileData: {
            displayName: 'Whiteboard Template',
          },
          nameID: randomUUID().slice(0, 8),
          content: templateData.whiteboard.content,
        },
        storageAggregator
      );
    }

    return await this.templateRepository.save(template);
  }

  async getTemplateOrFail(
    templateID: string,
    options?: FindOneOptions<Template>
  ): Promise<ITemplate | never> {
    const template = await this.templateRepository.findOne({
      ...options,
      where: {
        ...options?.where,
        id: templateID,
      },
    });
    if (!template)
      throw new EntityNotFoundException(
        `Not able to locate Template with the specified ID: ${templateID}`,
        LogContext.COMMUNICATION
      );
    return template;
  }

  async updateTemplate(
    templateInput: ITemplate,
    templateData: UpdateTemplateInput
  ): Promise<ITemplate> {
    const template = await this.getTemplateOrFail(templateInput.id, {
      relations: {
        profile: true,
        communityGuidelines: true,
        callout: true,
        whiteboard: true,
        innovationFlow: true,
      },
    });

    if (templateData.profile) {
      template.profile = await this.profileService.updateProfile(
        template.profile,
        templateData.profile
      );
    }
    if (
      template.type === TemplateType.POST &&
      templateData.postDefaultDescription
    ) {
      template.postDefaultDescription = templateData.postDefaultDescription;
    }

    if (
      template.type === TemplateType.INNOVATION_FLOW &&
      template.innovationFlow &&
      templateData.innovationFlow.states
    ) {
      this.innovationFlowService.updateInnovationFlow(
        {
          innovationFlowID: template.innovationFlow.id,
          states: templateData.innovationFlow.states,
        },
        true // isTemplate
      );
    }

    if (
      template.type === TemplateType.COMMUNITY_GUIDELINES &&
      templateData.communityGuidelines
    ) {
      if (!template.communityGuidelines) {
        throw new RelationshipNotFoundException(
          `Unable to load Guidelines on Template: ${templateInput.id} `,
          LogContext.TEMPLATES
        );
      }

      const guidelinesInput = templateData.communityGuidelines;
      template.communityGuidelines =
        await this.communityGuidelinesService.update(
          template.communityGuidelines,
          guidelinesInput
        );
    }

    if (template.type === TemplateType.CALLOUT && templateData.callout) {
      if (!template.callout) {
        throw new RelationshipNotFoundException(
          `Unable to load Callout on Template: ${templateInput.id} `,
          LogContext.TEMPLATES
        );
      }
      template.callout = await this.calloutService.updateCallout(
        template.callout,
        templateData.callout
      );
    }

    if (template.type === TemplateType.WHITEBOARD && templateData.whiteboard) {
      if (!template.whiteboard) {
        throw new RelationshipNotFoundException(
          `Unable to load Whiteboard on Template: ${templateInput.id} `,
          LogContext.TEMPLATES
        );
      }
      template.whiteboard = await this.whiteboardService.updateWhiteboard(
        template.whiteboard,
        templateData.whiteboard
      );
    }

    return await this.templateRepository.save(template);
  }

  async delete(templateInput: ITemplate): Promise<ITemplate> {
    const template = await this.getTemplateOrFail(templateInput.id, {
      relations: {
        profile: true,
        communityGuidelines: true,
        callout: true,
        whiteboard: true,
        innovationFlow: true,
      },
    });

    if (!template.profile || !template.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load Template with entities at start of delete: ${templateInput.id} `,
        LogContext.SPACES
      );
    }
    if (template.type === TemplateType.COMMUNITY_GUIDELINES) {
      if (!template.communityGuidelines) {
        throw new RelationshipNotFoundException(
          `Unable to load Guidelines on Template: ${templateInput.id} `,
          LogContext.TEMPLATES
        );
      }
      await this.communityGuidelinesService.deleteCommunityGuidelines(
        template.communityGuidelines.id
      );
    }

    if (template.type === TemplateType.CALLOUT) {
      if (!template.callout) {
        throw new RelationshipNotFoundException(
          `Unable to load Callout on Template: ${templateInput.id} `,
          LogContext.TEMPLATES
        );
      }
      await this.calloutService.deleteCallout(template.callout.id);
    }

    if (template.type === TemplateType.WHITEBOARD) {
      if (!template.whiteboard) {
        throw new RelationshipNotFoundException(
          `Unable to load Callout on Template: ${templateInput.id} `,
          LogContext.TEMPLATES
        );
      }
      await this.whiteboardService.deleteWhiteboard(template.whiteboard.id);
    }

    const templateId: string = template.id;
    await this.profileService.deleteProfile(template.profile.id);

    const result = await this.templateRepository.remove(template as Template);
    result.id = templateId;
    return result;
  }

  async save(template: ITemplate): Promise<ITemplate> {
    return await this.templateRepository.save(template);
  }

  async updateInnovationFlowStatesFromTemplate(
    innovationFlowData: UpdateInnovationFlowFromTemplateInput
  ): Promise<IInnovationFlow> {
    const innovationFlowFromTemplate = await this.getInnovationFlow(
      innovationFlowData.innovationFlowTemplateID
    );
    const newStatesStr = innovationFlowFromTemplate.states;
    const result = await this.innovationFlowService.updateInnovationFlowStates(
      innovationFlowData.innovationFlowID,
      newStatesStr
    );
    return result;
  }

  async getCountInTemplatesSet(
    templatesSetID: string,
    type: TemplateType
  ): Promise<number> {
    return await this.templateRepository.countBy({
      templatesSet: {
        id: templatesSetID,
      },
      type: type,
    });
  }
  async getTemplatesInTemplatesSet(
    templatesSetID: string
  ): Promise<ITemplate[]> {
    return await this.templateRepository.find({
      where: {
        templatesSet: {
          id: templatesSetID,
        },
      },
      relations: {
        profile: true,
      },
    });
  }

  async getTemplateTypeInTemplatesSet(
    templatesSetID: string,
    type: TemplateType
  ): Promise<ITemplate[]> {
    return await this.templateRepository.find({
      where: {
        templatesSet: {
          id: templatesSetID,
        },
        type: type,
      },
      relations: {
        profile: true,
      },
    });
  }

  async getTemplateInTemplatesSetOrFail(
    templatesSetID: string,
    templateIdOrNameId: string
  ): Promise<ITemplate> {
    let template = await this.templateRepository.findOne({
      where: {
        templatesSet: {
          id: templatesSetID,
        },
        nameID: templateIdOrNameId,
      },
    });
    if (!template) {
      template = await this.templateRepository.findOne({
        where: {
          templatesSet: {
            id: templatesSetID,
          },
          id: templateIdOrNameId,
        },
      });
    }
    if (!template) {
      throw new EntityNotFoundException(
        `Templates with ID/NameId(${templatesSetID}) not found!`,
        LogContext.TEMPLATES
      );
    }
    return template;
  }

  async getCommunityGuidelines(
    templateID: string
  ): Promise<ICommunityGuidelines> {
    const template = await this.getTemplateOrFail(templateID, {
      relations: {
        communityGuidelines: true,
      },
    });
    if (!template.communityGuidelines) {
      throw new RelationshipNotFoundException(
        `Unable to load Template with Community Guidelines: ${template.id} `,
        LogContext.TEMPLATES
      );
    }
    return template.communityGuidelines;
  }

  async getCallout(templateID: string): Promise<ICallout> {
    const template = await this.getTemplateOrFail(templateID, {
      relations: {
        callout: true,
      },
    });
    if (!template.callout) {
      throw new RelationshipNotFoundException(
        `Unable to load Template with Callout: ${template.id} `,
        LogContext.TEMPLATES
      );
    }
    return template.callout;
  }

  async getWhiteboard(templateID: string): Promise<IWhiteboard> {
    const template = await this.getTemplateOrFail(templateID, {
      relations: {
        whiteboard: true,
      },
    });
    if (!template.whiteboard) {
      throw new RelationshipNotFoundException(
        `Unable to load Template with Whiteboard: ${template.id} `,
        LogContext.TEMPLATES
      );
    }
    return template.whiteboard;
  }

  async getCollaboration(templateID: string): Promise<ICollaboration> {
    const template = await this.getTemplateOrFail(templateID, {
      relations: {
        collaboration: true,
      },
    });
    if (!template.collaboration) {
      throw new RelationshipNotFoundException(
        `Unable to load Template with Collaboration: ${template.id} `,
        LogContext.TEMPLATES
      );
    }
    return template.collaboration;
  }

  public async getInnovationFlow(templateID: string): Promise<IInnovationFlow> {
    const template = await this.getTemplateOrFail(templateID, {
      relations: {
        innovationFlow: true,
      },
    });
    if (!template.innovationFlow) {
      throw new RelationshipNotFoundException(
        `Unable to load Template with InnovationFlow: ${template.id} `,
        LogContext.TEMPLATES
      );
    }
    return template.innovationFlow;
  }
}
