import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
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
import { InnovationFlowStatesService } from '@domain/collaboration/innovation-flow-states/innovaton.flow.state.service';
import { IInnovationFlowState } from '@domain/collaboration/innovation-flow-states/innovation.flow.state.interface';
import { InvalidTemplateTypeException } from '@common/exceptions/invalid.template.type.exception';
import { CommunityGuidelinesService } from '@domain/community/community-guidelines/community.guidelines.service';
import { CreateCommunityGuidelinesInput } from '@domain/community/community-guidelines/dto/community.guidelines.dto.create';
import { ICommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.interface';
import { ICallout } from '@domain/collaboration/callout';
import { CalloutService } from '@domain/collaboration/callout/callout.service';

@Injectable()
export class TemplateService {
  constructor(
    private profileService: ProfileService,
    private innovationFlowStatesService: InnovationFlowStatesService,
    private communityGuidelinesService: CommunityGuidelinesService,
    private calloutService: CalloutService,
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
      templateData.profile,
      ProfileType.POST_TEMPLATE,
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
      template.postDefaultDescription = templateData.postDefaultDescription;
    } else if (template.type === TemplateType.INNOVATION_FLOW) {
      const convertedStates =
        this.innovationFlowStatesService.convertInputsToStates(
          templateData.innovationFlowStates
        );

      template.innovationFlowStates =
        this.innovationFlowStatesService.serializeStates(convertedStates);
    } else if (template.type === TemplateType.COMMUNITY_GUIDELINES) {
      let guidelinesInput: CreateCommunityGuidelinesInput;

      if (templateData.communityGuidelinesID) {
        // get the data from the existing guidelines
        const guidelines =
          await this.communityGuidelinesService.getCommunityGuidelinesOrFail(
            templateData.communityGuidelinesID,
            {
              relations: { profile: true },
            }
          );
        guidelinesInput = {
          profile: {
            displayName: guidelines.profile.displayName,
            description: guidelines.profile.description,
            tagsets: guidelines.profile.tagsets,
            referencesData: guidelines.profile.references,
          },
        };
      } else {
        // get the data from the input
        const guidelinesFromInput = templateData.communityGuidelines!;
        guidelinesInput = {
          profile: {
            displayName: guidelinesFromInput.profile.displayName,
            description: guidelinesFromInput.profile.description,
            tagsets: guidelinesFromInput.profile.tagsets,
            referencesData: guidelinesFromInput.profile.referencesData,
          },
        };
      }

      template.communityGuidelines =
        await this.communityGuidelinesService.createCommunityGuidelines(
          guidelinesInput,
          storageAggregator
        );
    } else if (template.type === TemplateType.CALLOUT) {
      template.callout = await this.calloutService.createCallout(
        templateData.callout!,
        [],
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
      templateData.innovationFlowStates
    ) {
      this.innovationFlowStatesService.validateDefinition(
        templateData.innovationFlowStates
      );
      const convertedStates =
        this.innovationFlowStatesService.convertInputsToStates(
          templateData.innovationFlowStates
        );
      template.innovationFlowStates =
        this.innovationFlowStatesService.serializeStates(convertedStates);
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
        templateData.callout
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

    const templateId: string = template.id;
    await this.profileService.deleteProfile(template.profile.id);

    const result = await this.templateRepository.remove(template as Template);
    result.id = templateId;
    return result;
  }

  async save(template: ITemplate): Promise<ITemplate> {
    return await this.templateRepository.save(template);
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

  public getInnovationFlowStates(template: ITemplate): IInnovationFlowState[] {
    if (template.type !== TemplateType.INNOVATION_FLOW) {
      throw new InvalidTemplateTypeException(
        `Template is not of type Innovation Flow: ${template.id}`,
        LogContext.TEMPLATES
      );
    }
    if (!template.innovationFlowStates) {
      return [];
    }
    return this.innovationFlowStatesService.getStates(
      template.innovationFlowStates
    );
  }
}
