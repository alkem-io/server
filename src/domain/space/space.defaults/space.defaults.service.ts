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
import { CreateCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create';
import { TemplateService } from '@domain/template/template/template.service';
import { InputCreatorService } from '@services/api/input-creator/input.creator.service';
import { TemplatesManagerService } from '@domain/template/templates-manager/templates.manager.service';
import { TemplateDefaultType } from '@common/enums/template.default.type';
import { ValidationException } from '@common/exceptions';
import { PlatformService } from '@platform/platform/platform.service';
import { ITemplatesManager } from '@domain/template/templates-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CalloutsSetService } from '@domain/collaboration/callouts-set/callouts.set.service';

@Injectable()
export class SpaceDefaultsService {
  constructor(
    private templateService: TemplateService,
    private inputCreatorService: InputCreatorService,
    private platformService: PlatformService,
    private calloutsSetService: CalloutsSetService,
    private templatesManagerService: TemplatesManagerService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async createCollaborationInput(
    collaborationData: CreateCollaborationOnSpaceInput,
    spaceLevel: SpaceLevel,
    platformTemplate?: TemplateDefaultType,
    spaceL0TemplatesManager?: ITemplatesManager
  ): Promise<CreateCollaborationInput> {
    const platformTemplatesManager =
      await this.platformService.getTemplatesManagerOrFail();

    // First get the template to augment the provided data with
    let inputFromTemplate: CreateCollaborationInput | undefined = undefined;
    if (collaborationData.collaborationTemplateID) {
      inputFromTemplate = await this.getCreateCollaborationInputFromTemplate(
        collaborationData.collaborationTemplateID
      );
    } else if (platformTemplate) {
      inputFromTemplate =
        await this.getCreateCollaborationInputFromTemplatesManager(
          platformTemplatesManager,
          platformTemplate
        );
    } else {
      switch (spaceLevel) {
        case SpaceLevel.L0:
          inputFromTemplate =
            await this.getCreateCollaborationInputFromTemplatesManager(
              platformTemplatesManager,
              TemplateDefaultType.PLATFORM_SPACE
            );
          break;
        case SpaceLevel.L1:
        case SpaceLevel.L2: {
          // First try to get the template from the library of the L0 space
          if (spaceL0TemplatesManager) {
            try {
              inputFromTemplate =
                await this.getCreateCollaborationInputFromTemplatesManager(
                  spaceL0TemplatesManager,
                  TemplateDefaultType.SPACE_SUBSPACE
                );
            } catch (e) {
              // Space does not have a subspace default template, just use the platform default
              this.logger.error(
                `Error while getting subspace default template, using platform default parentSpaceTemplatesManager.id: ${spaceL0TemplatesManager?.id}`,
                undefined,
                LogContext.TEMPLATES
              );
            }
            if (!inputFromTemplate) {
              // Space does not have a subspace default template, just use the platform default
              this.logger.warn(
                `Space does not have a subspace default template, using platform default parentSpaceTemplatesManager.id: ${spaceL0TemplatesManager?.id}`,
                undefined,
                LogContext.TEMPLATES
              );
            }
          }
          if (!inputFromTemplate) {
            inputFromTemplate =
              await this.getCreateCollaborationInputFromTemplatesManager(
                platformTemplatesManager,
                TemplateDefaultType.PLATFORM_SUBSPACE
              );
          }
          break;
        }
      }
    }
    if (!inputFromTemplate) {
      throw new ValidationException(
        `Unable to get collaboration input from templates using provided data: ${collaborationData}, ${platformTemplate}, ${spaceLevel}`,
        LogContext.SPACES
      );
    }

    if (!collaborationData.innovationFlowData) {
      if (inputFromTemplate) {
        collaborationData.innovationFlowData =
          inputFromTemplate.innovationFlowData;
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
          inputFromTemplate?.calloutsSetData.calloutsData;
      } else if (inputFromTemplate.calloutsSetData.calloutsData) {
        // The request includes the calloutsData, so merge template callouts with request callouts
        collaborationData.calloutsSetData.calloutsData.push(
          ...inputFromTemplate.calloutsSetData.calloutsData
        );
      }
    } else {
      collaborationData.calloutsSetData.calloutsData = [];
    }

    // Add in tutorials if needed
    if (collaborationData.addTutorialCallouts) {
      const tutorialsInputFromTemplate =
        await this.getCreateCollaborationInputFromTemplatesManager(
          platformTemplatesManager,
          TemplateDefaultType.PLATFORM_SPACE_TUTORIALS
        );

      if (tutorialsInputFromTemplate?.calloutsSetData.calloutsData) {
        collaborationData.calloutsSetData.calloutsData?.push(
          ...tutorialsInputFromTemplate.calloutsSetData.calloutsData
        );
      }
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

  private async getCreateCollaborationInputFromTemplatesManager(
    templatesManager: ITemplatesManager,
    templateDefaultType: TemplateDefaultType
  ): Promise<CreateCollaborationInput | undefined> {
    const template =
      await this.templatesManagerService.getTemplateFromTemplateDefault(
        templatesManager.id,
        templateDefaultType
      );
    if (!template) return undefined;

    return await this.getCreateCollaborationInputFromTemplate(template.id);
  }

  private async getCreateCollaborationInputFromTemplate(
    templateID: string
  ): Promise<CreateCollaborationInput | undefined> {
    const collaborationFromTemplate =
      await this.templateService.getCollaboration(templateID);
    const collaborationInput =
      await this.inputCreatorService.buildCreateCollaborationInputFromCollaboration(
        collaborationFromTemplate.id
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
