import { UUID_LENGTH } from '@common/constants';
import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOneOptions,
  FindOptionsRelationByString,
  Repository,
} from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { InnovationFlow } from './innovation.flow.entity';
import { IInnovationFlow } from './innovation.flow.interface';
import { UpdateInnovationFlowInput } from './dto/innovation.flow.dto.update';
import { CreateInnovationFlowInput } from './dto/innovation.flow.dto.create';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileService } from '@domain/common/profile/profile.service';
import { VisualType } from '@common/enums/visual.type';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { ILifecycle } from '@domain/common/lifecycle';
import { InnovationFlowTemplateService } from '@domain/template/innovation-flow-template/innovation.flow.template.service';
import { ILifecycleDefinition } from '@interfaces/lifecycle.definition.interface';
import { UpdateInnovationFlowLifecycleTemplateInput } from './dto/innovation.flow.dto.update.lifecycle.template';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { UpdateProfileSelectTagsetInput } from '@domain/common/profile/dto/profile.dto.update.select.tagset';
import { ITagset } from '@domain/common/tagset';
import { ITagsetTemplate } from '@domain/common/tagset-template/tagset.template.interface';
import { TagsetTemplateService } from '@domain/common/tagset-template/tagset.template.service';
import { TagsetService } from '@domain/common/tagset/tagset.service';

@Injectable()
export class InnovationFlowService {
  constructor(
    private profileService: ProfileService,
    private lifecycleService: LifecycleService,
    private innovationFlowTemplateService: InnovationFlowTemplateService,
    private tagsetService: TagsetService,
    private tagsetTemplateService: TagsetTemplateService,
    @InjectRepository(InnovationFlow)
    private innovationFlowRepository: Repository<InnovationFlow>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createInnovationFlow(
    innovationFlowData: CreateInnovationFlowInput,
    tagsetTemplates: ITagsetTemplate[]
  ): Promise<IInnovationFlow> {
    if (innovationFlowData.innovationFlowTemplateID) {
      await this.innovationFlowTemplateService.validateInnovationFlowDefinitionOrFail(
        innovationFlowData.innovationFlowTemplateID,
        innovationFlowData.spaceID,
        innovationFlowData.type
      );
    } else {
      innovationFlowData.innovationFlowTemplateID =
        await this.innovationFlowTemplateService.getDefaultInnovationFlowTemplateId(
          innovationFlowData.spaceID,
          innovationFlowData.type
        );
    }
    const innovationFlow: IInnovationFlow = new InnovationFlow();
    innovationFlow.authorization = new AuthorizationPolicy();
    innovationFlow.spaceID = innovationFlowData.spaceID;
    innovationFlow.type = innovationFlowData.type;

    const tagsetInputs =
      this.profileService.convertTagsetTemplatesToCreateTagsetInput(
        tagsetTemplates
      );

    innovationFlowData.profile.tagsets =
      this.profileService.updateProfileTagsetInputs(
        innovationFlowData.profile.tagsets,
        tagsetInputs
      );
    innovationFlow.profile = await this.profileService.createProfile(
      innovationFlowData.profile
    );

    await this.profileService.addVisualOnProfile(
      innovationFlow.profile,
      VisualType.CARD
    );

    const machineConfig: ILifecycleDefinition =
      await this.innovationFlowTemplateService.getInnovationFlowDefinitionFromTemplate(
        innovationFlowData.innovationFlowTemplateID,
        innovationFlowData.spaceID,
        innovationFlowData.type
      );

    innovationFlow.lifecycle = await this.lifecycleService.createLifecycle(
      innovationFlow.id,
      machineConfig
    );

    return await this.innovationFlowRepository.save(innovationFlow);
  }

  async save(innovationFlow: IInnovationFlow): Promise<IInnovationFlow> {
    return await this.innovationFlowRepository.save(innovationFlow);
  }

  async update(
    innovationFlowData: UpdateInnovationFlowInput
  ): Promise<IInnovationFlow> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowData.innovationFlowID,
      {
        relations: ['profile', 'lifecycle'],
      }
    );

    const visibleStates = innovationFlowData.visibleStates;
    if (visibleStates && innovationFlow.lifecycle) {
      const states = this.lifecycleService.getStates(innovationFlow.lifecycle);
      for (const visibleState of visibleStates) {
        if (!states.includes(visibleState)) {
          throw new ValidationException(
            `Provided set of visibleStates (${visibleStates}) has value '${visibleState}'
            that is not in the Lifecycle states: ${states}`,
            LogContext.CHALLENGES
          );
        }
      }
      const updateData: UpdateProfileSelectTagsetInput = {
        profileID: innovationFlow.profile.id,
        allowedValues: innovationFlowData.visibleStates,
        tagsetName: TagsetReservedName.FLOW_STATE.valueOf(),
      };
      await this.profileService.updateSelectTagset(updateData);
    }

    if (innovationFlowData.profileData) {
      innovationFlow.profile = await this.profileService.updateProfile(
        innovationFlow.profile,
        innovationFlowData.profileData
      );
    }

    return await this.innovationFlowRepository.save(innovationFlow);
  }

  async deleteInnovationFlow(
    innovationFlowID: string
  ): Promise<IInnovationFlow> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowID,
      {
        relations: ['lifecycle', 'profile'],
      }
    );

    if (innovationFlow.lifecycle) {
      await this.lifecycleService.deleteLifecycle(innovationFlow.lifecycle.id);
    }

    if (innovationFlow.profile) {
      await this.profileService.deleteProfile(innovationFlow.profile.id);
    }

    const result = await this.innovationFlowRepository.remove(
      innovationFlow as InnovationFlow
    );
    result.id = innovationFlowID;
    return result;
  }

  async getInnovationFlowOrFail(
    innovationFlowID: string,
    options?: FindOneOptions<InnovationFlow>
  ): Promise<IInnovationFlow | never> {
    let innovationFlow: IInnovationFlow | null = null;
    if (innovationFlowID.length === UUID_LENGTH) {
      innovationFlow = await this.innovationFlowRepository.findOne({
        where: { id: innovationFlowID },
        ...options,
      });
    }

    if (!innovationFlow)
      throw new EntityNotFoundException(
        `Unable to find InnovationFlow with ID: ${innovationFlowID}`,
        LogContext.CHALLENGES
      );
    return innovationFlow;
  }

  async getInnovationFlowStates(
    innovationFlow: IInnovationFlow
  ): Promise<string[]> {
    const lifecycle = await this.getLifecycle(innovationFlow.id);
    return await this.lifecycleService.getStates(lifecycle);
  }

  public async getProfile(
    innovationFlowInput: IInnovationFlow,
    relations: FindOptionsRelationByString = []
  ): Promise<IProfile> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowInput.id,
      {
        relations: ['profile', ...relations],
      }
    );
    if (!innovationFlow.profile)
      throw new EntityNotFoundException(
        `InnovationFlow profile not initialised: ${innovationFlow.id}`,
        LogContext.COLLABORATION
      );

    return innovationFlow.profile;
  }
  async getLifecycle(innovationFlowId: string): Promise<ILifecycle> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowId,
      {
        relations: ['lifecycle'],
      }
    );
    const lifecycle = innovationFlow.lifecycle;

    if (!lifecycle) {
      throw new EntityNotFoundException(
        `Unable to find lifecycle for innovationFlow with ID: ${innovationFlow.id}`,
        LogContext.CHALLENGES
      );
    }

    return lifecycle;
  }

  async updateInnovationFlowTemplate(
    innovationFlowTemplateData: UpdateInnovationFlowLifecycleTemplateInput
  ): Promise<IInnovationFlow> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowTemplateData.innovationFlowID,
      {
        relations: ['lifecycle'],
      }
    );

    if (!innovationFlow.lifecycle) {
      throw new EntityNotInitializedException(
        `Lifecycle of Innovation Flow (${innovationFlow.id}) not initialized`,
        LogContext.CHALLENGES
      );
    }

    const machineConfig: ILifecycleDefinition =
      await this.innovationFlowTemplateService.getInnovationFlowDefinitionFromTemplate(
        innovationFlowTemplateData.innovationFlowTemplateID,
        innovationFlow.spaceID,
        innovationFlow.type
      );

    innovationFlow.lifecycle.machineDef = JSON.stringify(machineConfig);
    innovationFlow.lifecycle.machineState = '';

    const updatedInnovationFlow = await this.innovationFlowRepository.save(
      innovationFlow
    );
    await this.updateStatesTagsetTemplateToMatchLifecycle(innovationFlow.id);
    return updatedInnovationFlow;
  }

  async updateFlowStateTagsetTemplateForLifecycle(
    innovationFlow: IInnovationFlow,
    tagsetTemplate: ITagsetTemplate
  ): Promise<ITagsetTemplate> {
    if (!innovationFlow.lifecycle) {
      throw new EntityNotInitializedException(
        `Lifecycle or Profile of Innovation Flow (${innovationFlow.id}) not initialized`,
        LogContext.CHALLENGES
      );
    }

    tagsetTemplate.allowedValues = this.lifecycleService.getStates(
      innovationFlow.lifecycle
    );
    tagsetTemplate.defaultSelectedValue = this.lifecycleService.getState(
      innovationFlow.lifecycle
    );

    return await this.tagsetTemplateService.save(tagsetTemplate);
  }

  async updateStateTagsetForLifecycle(
    innovationFlow: IInnovationFlow,
    stateTagset: ITagset
  ): Promise<ITagset> {
    if (!innovationFlow.lifecycle) {
      throw new EntityNotInitializedException(
        `Lifecycle or Profile of Innovation Flow (${innovationFlow.id}) not initialized`,
        LogContext.CHALLENGES
      );
    }

    const state = this.lifecycleService.getState(innovationFlow.lifecycle);
    stateTagset.tags = [state];

    return await this.tagsetService.save(stateTagset);
  }

  async updateStatesTagsetTemplateToMatchLifecycle(
    innovationFlowID: string
  ): Promise<ITagset> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowID,
      {
        relations: ['lifecycle', 'profile'],
      }
    );

    if (!innovationFlow.lifecycle || !innovationFlow.profile) {
      throw new EntityNotInitializedException(
        `Lifecycle or Profile of Innovation Flow (${innovationFlow.id}) not initialized`,
        LogContext.CHALLENGES
      );
    }

    const states = this.lifecycleService.getStates(innovationFlow.lifecycle);
    const state = this.lifecycleService.getState(innovationFlow.lifecycle);

    const updateData: UpdateProfileSelectTagsetInput = {
      profileID: innovationFlow.profile.id,
      allowedValues: states,
      tagsetName: TagsetReservedName.FLOW_STATE.valueOf(),
      tags: [state],
    };
    return await this.profileService.updateSelectTagset(updateData);
  }
}
