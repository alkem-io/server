import { UUID_LENGTH } from '@common/constants';
import { LogContext, ProfileType } from '@common/enums';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { InnovationFlow } from './innovation.flow.entity';
import { IInnovationFlow } from './innovation.flow.interface';
import { UpdateInnovationFlowInput } from './dto/innovation.flow.dto.update';
import { CreateInnovationFlowInput } from './dto/innovation.flow.dto.create';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileService } from '@domain/common/profile/profile.service';
import { VisualType } from '@common/enums/visual.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { UpdateProfileSelectTagsetDefinitionInput } from '@domain/common/profile/dto/profile.dto.update.select.tagset.definition';
import { ITagsetTemplate } from '@domain/common/tagset-template/tagset.template.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { UpdateInnovationFlowSelectedStateInput } from './dto/innovation.flow.dto.update.selected.state';
import { UpdateProfileSelectTagsetValueInput } from '@domain/common/profile/dto/profile.dto.update.select.tagset.value';
import { InnovationFlowStatesService } from '../innovation-flow-states/innovaton.flow.state.service';
import { IInnovationFlowState } from '../innovation-flow-states/innovation.flow.state.interface';
import { UpdateInnovationFlowFromTemplateInput } from './dto/innovation.flow.dto.update.from.template';
import { InnovationFlowTemplateService } from '@domain/template/innovation-flow-template/innovation.flow.template.service';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { UpdateInnovationFlowSingleStateInput } from './dto/innovation.flow.dto.update.single.state';

@Injectable()
export class InnovationFlowService {
  constructor(
    private profileService: ProfileService,
    private tagsetService: TagsetService,
    private innovationFlowStatesService: InnovationFlowStatesService,
    private innovationFlowTemplateService: InnovationFlowTemplateService,
    @InjectRepository(InnovationFlow)
    private innovationFlowRepository: Repository<InnovationFlow>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createInnovationFlow(
    innovationFlowData: CreateInnovationFlowInput,
    tagsetTemplates: ITagsetTemplate[],
    storageAggregator: IStorageAggregator
  ): Promise<IInnovationFlow> {
    const innovationFlow: IInnovationFlow = new InnovationFlow();
    innovationFlow.authorization = new AuthorizationPolicy();
    if (innovationFlowData.states.length === 0) {
      throw new ValidationException(
        `Require at least one state to create an InnovationFlow: ${innovationFlowData}`,
        LogContext.CHALLENGES
      );
    }

    const tagsetInputs =
      this.profileService.convertTagsetTemplatesToCreateTagsetInput(
        tagsetTemplates
      );

    innovationFlowData.profile.tagsets =
      this.profileService.updateProfileTagsetInputs(
        innovationFlowData.profile.tagsets,
        tagsetInputs
      );

    // Update the flow state tagset to have the default value
    const newStateNames = innovationFlowData.states.map(
      state => state.displayName
    );
    const defaultSelectedState = newStateNames[0]; // default to first in the list
    const flowTagsetInput = innovationFlowData.profile.tagsets.find(
      t => t.name === TagsetReservedName.FLOW_STATE.valueOf()
    );
    if (flowTagsetInput) {
      flowTagsetInput.tags = [defaultSelectedState];
    }
    innovationFlow.profile = await this.profileService.createProfile(
      innovationFlowData.profile,
      ProfileType.INNOVATION_FLOW,
      storageAggregator
    );

    await this.profileService.addVisualOnProfile(
      innovationFlow.profile,
      VisualType.CARD
    );

    innovationFlow.states = this.innovationFlowStatesService.serializeStates(
      innovationFlowData.states
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
        relations: { profile: true },
      }
    );

    if (innovationFlowData.states) {
      const newStateNames = innovationFlowData.states.map(
        state => state.displayName
      );

      const defaultSelectedState = newStateNames[0]; // default to first in the list
      const updateData: UpdateProfileSelectTagsetDefinitionInput = {
        profileID: innovationFlow.profile.id,
        allowedValues: newStateNames,
        defaultSelectedValue: defaultSelectedState,
        tagsetName: TagsetReservedName.FLOW_STATE.valueOf(),
      };
      await this.profileService.updateSelectTagsetDefinition(updateData);

      // serialize the states
      innovationFlow.states = this.innovationFlowStatesService.serializeStates(
        innovationFlowData.states
      );
    }

    if (innovationFlowData.profileData) {
      innovationFlow.profile = await this.profileService.updateProfile(
        innovationFlow.profile,
        innovationFlowData.profileData
      );
    }

    return await this.innovationFlowRepository.save(innovationFlow);
  }

  async updateStatesFromTemplate(
    innovationFlowData: UpdateInnovationFlowFromTemplateInput
  ): Promise<IInnovationFlow> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowData.innovationFlowID,
      {
        relations: { profile: true },
      }
    );
    const innovationFlowTemplate =
      await this.innovationFlowTemplateService.getInnovationFlowTemplateOrFail(
        innovationFlowData.innovationFlowTemplateID
      );

    const newStates = this.innovationFlowStatesService.getStates(
      innovationFlowTemplate.states
    );

    const newStateNames = newStates.map(state => state.displayName);

    const defaultSelectedState = newStateNames[0]; // default to first in the list
    const updateData: UpdateProfileSelectTagsetDefinitionInput = {
      profileID: innovationFlow.profile.id,
      allowedValues: newStateNames,
      defaultSelectedValue: defaultSelectedState,
      tagsetName: TagsetReservedName.FLOW_STATE.valueOf(),
    };
    await this.profileService.updateSelectTagsetDefinition(updateData);

    // serialize the states
    innovationFlow.states =
      this.innovationFlowStatesService.serializeStates(newStates);

    return await this.innovationFlowRepository.save(innovationFlow);
  }

  async updateSelectedState(
    innovationFlowSelectedStateData: UpdateInnovationFlowSelectedStateInput
  ): Promise<IInnovationFlow> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowSelectedStateData.innovationFlowID,
      {
        relations: { profile: true },
      }
    );

    const statesTagset = await this.profileService.getTagset(
      innovationFlow.profile.id,
      TagsetReservedName.FLOW_STATE.valueOf()
    );
    const statesTagsetTemplate =
      await this.tagsetService.getTagsetTemplateOrFail(statesTagset.id);

    const newStateName = innovationFlowSelectedStateData.selectedState;
    const newStateAllowed =
      statesTagsetTemplate.allowedValues.includes(newStateName);

    if (!newStateAllowed) {
      throw new ValidationException(
        `New state '${newStateName}' not in allowed states: ${statesTagset.tags}`,
        LogContext.INNOVATION_FLOW
      );
    }

    const updateData: UpdateProfileSelectTagsetValueInput = {
      profileID: innovationFlow.profile.id,
      selectedValue: newStateName,
      tagsetName: TagsetReservedName.FLOW_STATE.valueOf(),
    };
    await this.profileService.updateSelectTagsetValue(updateData);
    return await this.getInnovationFlowOrFail(
      innovationFlowSelectedStateData.innovationFlowID,
      {
        relations: { profile: true },
      }
    );
  }

  async updateSingleState(
    updateData: UpdateInnovationFlowSingleStateInput
  ): Promise<IInnovationFlow> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      updateData.innovationFlowID,
      {
        relations: { profile: true },
      }
    );
    const states = this.innovationFlowStatesService.getStates(
      innovationFlow.states
    );
    // First update the states definition
    const stateToUpdate = states.find(
      s => s.displayName === updateData.stateDisplayName
    );
    if (!stateToUpdate) {
      throw new ValidationException(
        `Unable to find '${
          updateData.stateDisplayName
        }' in existing set of state names: ${this.innovationFlowStatesService.getStateNames(
          innovationFlow.states
        )}`,
        LogContext.INNOVATION_FLOW
      );
    }
    const newStates: IInnovationFlowState[] = [];
    for (const state of states) {
      if (state.displayName === updateData.stateDisplayName) {
        state.displayName = updateData.stateUpdatedData.displayName;
        state.description = updateData.stateUpdatedData.description;
      }
      newStates.push(state);
    }
    innovationFlow.states =
      this.innovationFlowStatesService.serializeStates(newStates);

    // Save with new states before updating selected values
    await this.innovationFlowRepository.save(innovationFlow);

    // Now update the selected state

    const statesTagset = await this.profileService.getTagset(
      innovationFlow.profile.id,
      TagsetReservedName.FLOW_STATE.valueOf()
    );
    if (statesTagset.tags.length !== 1) {
      throw new ValidationException(
        `Unable to find selected value on flow tagset: ${statesTagset.tags}`,
        LogContext.INNOVATION_FLOW
      );
    }

    // Update the allowed values on the tagset, and any tagsets with the old value
    const newStateNames = newStates.map(state => state.displayName);
    const defaultSelectedState = newStateNames[0]; // default to first in the list
    const updateTagsetDefinitionData: UpdateProfileSelectTagsetDefinitionInput =
      {
        profileID: innovationFlow.profile.id,
        allowedValues: newStateNames,
        defaultSelectedValue: defaultSelectedState,
        tagsetName: TagsetReservedName.FLOW_STATE.valueOf(),
        oldSelectedValue: updateData.stateDisplayName,
        newSelectedValue: updateData.stateUpdatedData.displayName,
      };
    await this.profileService.updateSelectTagsetDefinition(
      updateTagsetDefinitionData
    );

    return await this.getInnovationFlowOrFail(updateData.innovationFlowID);
  }

  async deleteInnovationFlow(
    innovationFlowID: string
  ): Promise<IInnovationFlow> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowID,
      {
        relations: { profile: true },
      }
    );

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

  public async getProfile(
    innovationFlowInput: IInnovationFlow,
    relations?: FindOptionsRelations<IInnovationFlow>
  ): Promise<IProfile> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowInput.id,
      {
        relations: { profile: true, ...relations },
      }
    );
    if (!innovationFlow.profile)
      throw new EntityNotFoundException(
        `InnovationFlow profile not initialised: ${innovationFlow.id}`,
        LogContext.COLLABORATION
      );

    return innovationFlow.profile;
  }

  public getStates(
    innovationFlowInput: IInnovationFlow
  ): IInnovationFlowState[] {
    return this.innovationFlowStatesService.getStates(
      innovationFlowInput.states
    );
  }

  public async getCurrentState(
    innovationFlowInput: IInnovationFlow
  ): Promise<IInnovationFlowState> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowInput.id,
      {
        relations: { profile: true },
      }
    );
    const statesTagset = await this.profileService.getTagset(
      innovationFlow.profile.id,
      TagsetReservedName.FLOW_STATE.valueOf()
    );
    const tags = statesTagset.tags;
    if (tags.length !== 1) {
      throw new EntityNotFoundException(
        `InnovationFlow without FLOW STATE tagset with tag found: ${innovationFlow.id}`,
        LogContext.COLLABORATION
      );
    }
    const selectedStateDisplayName = tags[0];
    const states = this.getStates(innovationFlow);
    const currentState = states.find(
      s => s.displayName === selectedStateDisplayName
    );
    if (!currentState) {
      throw new EntityNotFoundException(
        `InnovationFlow FLOW STATE tagset could not find InnovationFlowState to match selected value: ${innovationFlow.id}, ${selectedStateDisplayName}`,
        LogContext.COLLABORATION
      );
    }
    return currentState;
  }
}
