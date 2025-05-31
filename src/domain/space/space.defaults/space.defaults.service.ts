import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LogContext } from '@common/enums/logging.context';
import { ISpaceSettings } from '../space.settings/space.settings.interface';
import { subspaceCommunityRoles } from './definitions/subspace.community.roles';
import { spaceCommunityRoles } from './definitions/space.community.roles';
import { CreateFormInput } from '@domain/common/form/dto/form.dto.create';
import { subspaceCommunityApplicationForm } from './definitions/subspace.community.role.application.form';
import { spaceCommunityApplicationForm } from './definitions/space.community.role.application.form';
import { SpaceLevel } from '@common/enums/space.level';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { spaceDefaultsSettingsL0 } from './definitions/settings/space.defaults.settings.l0';
import { spaceDefaultsSettingsL2 } from './definitions/settings/space.defaults.settings.l2';
import { spaceDefaultsSettingsL1 } from './definitions/settings/space.defaults.settings.l1';
import { CreateRoleInput } from '@domain/access/role/dto/role.dto.create';
import { CreateCollaborationOnSpaceInput } from '../space/dto/space.dto.create.collaboration';
import { TemplateService } from '@domain/template/template/template.service';
import { InputCreatorService } from '@services/api/input-creator/input.creator.service';
import { TemplateDefaultType } from '@common/enums/template.default.type';
import {
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { ITemplatesManager } from '@domain/template/templates-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CalloutsSetService } from '@domain/collaboration/callouts-set/callouts.set.service';
import { PlatformTemplatesService } from '@platform/platform-templates/platform.templates.service';
import { ITemplate } from '@domain/template/template/template.interface';
import { CreateCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create';
import { TemplatesManagerService } from '@domain/template/templates-manager/templates.manager.service';

@Injectable()
export class SpaceDefaultsService {
  constructor(
    private templateService: TemplateService,
    private inputCreatorService: InputCreatorService,
    private calloutsSetService: CalloutsSetService,
    private platformTemplatesService: PlatformTemplatesService,
    private templatesManagerService: TemplatesManagerService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async createCollaborationInput(
    collaborationData: CreateCollaborationOnSpaceInput,
    templateWithSpaceContent: ITemplate
  ): Promise<CreateCollaborationOnSpaceInput> {
    const collaborationDataFromTemplate =
      await this.getCreateCollaborationInputFromTemplate(
        templateWithSpaceContent.id
      );
    if (!collaborationDataFromTemplate) {
      throw new RelationshipNotFoundException(
        `Collaboration not found in template with ID: ${templateWithSpaceContent.id}`,
        LogContext.TEMPLATES
      );
    }

    if (!collaborationData.innovationFlowData) {
      if (collaborationDataFromTemplate) {
        collaborationData.innovationFlowData =
          collaborationDataFromTemplate.innovationFlowData;
      } else {
        throw new ValidationException(
          'No innovation flow data provided',
          LogContext.SPACES
        );
      }
    }

    if (collaborationData.addCallouts) {
      if (!collaborationData.calloutsSetData.calloutsData) {
        collaborationData.calloutsSetData.calloutsData =
          collaborationDataFromTemplate?.calloutsSetData.calloutsData;
      } else if (collaborationDataFromTemplate.calloutsSetData.calloutsData) {
        // The request includes the calloutsData, so merge template callouts with request callouts
        collaborationData.calloutsSetData.calloutsData.push(
          ...collaborationDataFromTemplate.calloutsSetData.calloutsData
        );
      }
    } else {
      collaborationData.calloutsSetData.calloutsData = [];
    }

    // Move callouts that are not in valid flowStates to the default first flowState
    const validFlowStateNames =
      collaborationData.innovationFlowData?.states?.map(
        state => state.displayName
      );

    this.calloutsSetService.moveCalloutsToDefaultFlowState(
      validFlowStateNames ?? [],
      collaborationData.calloutsSetData.calloutsData ?? []
    );

    return collaborationData;
  }

  public async getSpaceContentTemplateToAugmentFrom(
    collaborationData: CreateCollaborationOnSpaceInput,
    spaceLevel: SpaceLevel,
    platformTemplate?: TemplateDefaultType,
    spaceL0TemplatesManager?: ITemplatesManager
  ): Promise<ITemplate> {
    // First get the template to augment the provided data with
    let templateWithSpaceContent: ITemplate | undefined = undefined;

    if (collaborationData.spaceTemplateID) {
      templateWithSpaceContent = await this.templateService.getTemplateOrFail(
        collaborationData.spaceTemplateID
      );
    } else if (platformTemplate) {
      templateWithSpaceContent =
        await this.platformTemplatesService.getPlatformDefaultTemplateByType(
          platformTemplate
        );
    } else {
      switch (spaceLevel) {
        case SpaceLevel.L0:
          templateWithSpaceContent =
            await this.platformTemplatesService.getPlatformDefaultTemplateByType(
              TemplateDefaultType.PLATFORM_SPACE
            );
          break;
        case SpaceLevel.L1:
        case SpaceLevel.L2: {
          // First try to get the template from the library of the L0 space
          if (spaceL0TemplatesManager) {
            try {
              templateWithSpaceContent =
                await this.templatesManagerService.getTemplateFromTemplateDefault(
                  spaceL0TemplatesManager.id,
                  TemplateDefaultType.SPACE_SUBSPACE
                );
            } catch (e) {
              // Space does not have a subspace default template, just use the platform default
              this.logger.warn(
                `Space does not have a subspace default template, using platform default parentSpaceTemplatesManager.id: ${spaceL0TemplatesManager?.id}, ${e}`,
                undefined,
                LogContext.TEMPLATES
              );
            }
          }
          if (!templateWithSpaceContent) {
            templateWithSpaceContent =
              await this.platformTemplatesService.getPlatformDefaultTemplateByType(
                TemplateDefaultType.PLATFORM_SUBSPACE
              );
          }
          break;
        }
      }
    }
    if (
      !templateWithSpaceContent ||
      !templateWithSpaceContent.contentSpace ||
      !templateWithSpaceContent.contentSpace.collaboration
    ) {
      throw new ValidationException(
        `Unable to get templates using provided data: ${collaborationData}, ${platformTemplate}, ${spaceLevel}`,
        LogContext.SPACES
      );
    }
    return templateWithSpaceContent;
  }

  public async addTutorialCalloutsFromTemplate(
    collaborationData: CreateCollaborationInput
  ): Promise<CreateCollaborationInput> {
    const tutorialsSpaceContentTemplate =
      await this.platformTemplatesService.getPlatformDefaultTemplateByType(
        TemplateDefaultType.PLATFORM_SPACE_TUTORIALS
      );
    const tutorialsInputFromTemplate =
      await this.getCreateCollaborationInputFromTemplate(
        tutorialsSpaceContentTemplate.id
      );

    if (tutorialsInputFromTemplate?.calloutsSetData.calloutsData) {
      collaborationData.calloutsSetData.calloutsData?.push(
        ...tutorialsInputFromTemplate.calloutsSetData.calloutsData
      );
    }

    // Move callouts that are not in valid flowStates to the default first flowState
    const validFlowStateNames =
      collaborationData.innovationFlowData?.states?.map(
        state => state.displayName
      );

    this.calloutsSetService.moveCalloutsToDefaultFlowState(
      validFlowStateNames ?? [],
      collaborationData.calloutsSetData.calloutsData ?? []
    );

    return collaborationData;
  }

  private async getCreateCollaborationInputFromTemplate(
    templateID: string
  ): Promise<CreateCollaborationInput | undefined> {
    const contentSpaceFromTemplate =
      await this.templateService.getTemplateContentSpace(templateID);
    if (!contentSpaceFromTemplate?.collaboration) {
      throw new RelationshipNotFoundException(
        `Collaboration not found in SpaceContentTemplate with ID: ${templateID}`,
        LogContext.TEMPLATES
      );
    }
    const collaborationInput =
      await this.inputCreatorService.buildCreateCollaborationInputFromCollaboration(
        contentSpaceFromTemplate.collaboration.id
      );
    return collaborationInput;
  }

  public getRoleSetCommunityRoles(spaceLevel: SpaceLevel): CreateRoleInput[] {
    switch (spaceLevel) {
      case SpaceLevel.L1:
      case SpaceLevel.L2:
        return subspaceCommunityRoles;
      case SpaceLevel.L0:
        return spaceCommunityRoles;
      default:
        throw new EntityNotInitializedException(
          `Invalid space level: ${spaceLevel}`,
          LogContext.ROLES
        );
    }
  }

  public getRoleSetCommunityApplicationForm(
    spaceLevel: SpaceLevel
  ): CreateFormInput {
    switch (spaceLevel) {
      case SpaceLevel.L1:
      case SpaceLevel.L2:
        return subspaceCommunityApplicationForm;
      case SpaceLevel.L0:
        return spaceCommunityApplicationForm;
    }
  }

  public getDefaultSpaceSettings(spaceLevel: SpaceLevel): ISpaceSettings {
    switch (spaceLevel) {
      case SpaceLevel.L0:
        return spaceDefaultsSettingsL0;
      case SpaceLevel.L1:
        return spaceDefaultsSettingsL1;
      case SpaceLevel.L2:
        return spaceDefaultsSettingsL2;
      default:
        throw new EntityNotInitializedException(
          `Invalid space level: ${spaceLevel}`,
          LogContext.ROLES
        );
    }
  }
}
