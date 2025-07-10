import { LogContext, ProfileType } from '@common/enums';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { InnovationFlow } from './innovation.flow.entity';
import { IInnovationFlow } from './innovation.flow.interface';
import { UpdateInnovationFlowEntityInput } from './dto/innovation.flow.dto.update.entity';
import { CreateInnovationFlowInput } from './dto/innovation.flow.dto.create';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileService } from '@domain/common/profile/profile.service';
import { VisualType } from '@common/enums/visual.type';
import { ITagsetTemplate } from '@domain/common/tagset-template/tagset.template.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { UpdateInnovationFlowSelectedStateInput } from './dto/innovation.flow.dto.update.selected.state';
import { UpdateInnovationFlowSingleStateInput } from './dto/innovation.flow.dto.update.single.state';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { CreateInnovationFlowStateInput } from '../innovation-flow-state/dto/innovation.flow.state.dto.create';
import { UpdateInnovationFlowStateInput } from '../innovation-flow-state/dto/innovation.flow.state.dto.update';
import { TagsetTemplateService } from '@domain/common/tagset-template/tagset.template.service';
import { UpdateTagsetTemplateDefinitionInput } from '@domain/common/tagset-template';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { InnovationFlowStateService } from '../innovation-flow-state/innovation.flow.state.service';
import { IInnovationFlowState } from '../innovation-flow-state/innovation.flow.state.interface';

@Injectable()
export class InnovationFlowService {
  constructor(
    private profileService: ProfileService,
    private tagsetService: TagsetService,
    private tagsetTemplateService: TagsetTemplateService,
    private innovationFlowStateService: InnovationFlowStateService,
    @InjectRepository(InnovationFlow)
    private innovationFlowRepository: Repository<InnovationFlow>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createInnovationFlow(
    innovationFlowData: CreateInnovationFlowInput,
    storageAggregator: IStorageAggregator,
    flowTagsetTemplate?: ITagsetTemplate,
    isTemplate: boolean = false
  ): Promise<IInnovationFlow> {
    const innovationFlow: IInnovationFlow = InnovationFlow.create({
      settings: innovationFlowData.settings,
    });
    innovationFlow.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.INNOVATION_FLOW
    );
    if (innovationFlowData.states.length === 0) {
      throw new ValidationException(
        `Require at least one state to create an InnovationFlow: ${innovationFlowData}`,
        LogContext.INNOVATION_FLOW
      );
    }

    if (!isTemplate) {
      if (!flowTagsetTemplate) {
        throw new ValidationException(
          `Require flowTagsetTemplate on non-template InnovationFlow: ${innovationFlowData}`,
          LogContext.INNOVATION_FLOW
        );
      }
      innovationFlow.flowStatesTagsetTemplate = flowTagsetTemplate;
    }

    innovationFlow.profile = await this.profileService.createProfile(
      innovationFlowData.profile,
      ProfileType.INNOVATION_FLOW,
      storageAggregator
    );

    await this.profileService.addVisualsOnProfile(
      innovationFlow.profile,
      innovationFlowData.profile.visuals,
      [VisualType.CARD]
    );

    innovationFlow.states =
      this.innovationFlowStateService.convertInputsToStates(
        innovationFlowData.states
      );
    innovationFlow.currentState = innovationFlow.states[0];

    return innovationFlow;
  }

  async save(innovationFlow: IInnovationFlow): Promise<IInnovationFlow> {
    return await this.innovationFlowRepository.save(innovationFlow);
  }

  async updateInnovationFlow(
    innovationFlowData: UpdateInnovationFlowEntityInput,
    isTemplate: boolean = false
  ): Promise<IInnovationFlow> {
    let innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowData.innovationFlowID,
      {
        relations: {
          profile: true,
          flowStatesTagsetTemplate: {
            tagsets: true,
          },
        },
      }
    );

    this.innovationFlowStateService.validateDefinition(
      innovationFlowData.states,
      innovationFlow.settings
    );
    innovationFlow = await this.updateInnovationFlowStates(
      innovationFlow,
      this.innovationFlowStateService.convertInputsToStates(
        innovationFlowData.states
      ),
      isTemplate
    );

    if (innovationFlowData.profileData) {
      innovationFlow.profile = await this.profileService.updateProfile(
        innovationFlow.profile,
        innovationFlowData.profileData
      );
    }

    return await this.innovationFlowRepository.save(innovationFlow);
  }

  public async updateInnovationFlowStates(
    innovationFlow: IInnovationFlow,
    newStates: IInnovationFlowState[],
    isTemplate: boolean = false
  ) {
    // Update the innovation flow entity
    const currentStateStillValid = newStates.some(
      state => state.displayName === innovationFlow.currentState.displayName
    );
    if (!currentStateStillValid) {
      // if the current state is not in the new states, set it to the first one
      innovationFlow.currentState = newStates[0];
    }
    innovationFlow.states = newStates;
    innovationFlow = await this.save(innovationFlow);

    if (!isTemplate) {
      const tagsetAllowedValues = newStates.map(state => state.displayName);
      const tagsetDefaultSelectedValue =
        innovationFlow.currentState.displayName;
      await this.updateFlowStatesTagsetTemplate(
        innovationFlow.id,
        tagsetAllowedValues,
        tagsetDefaultSelectedValue
      );
    }

    return innovationFlow;
  }

  private async updateFlowStatesTagsetTemplate(
    innovationFlowID: string,
    allowedValues: string[],
    defaultSelectedValue: string
  ) {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowID,
      {
        relations: {
          flowStatesTagsetTemplate: {
            tagsets: true,
          },
        },
      }
    );
    if (
      !innovationFlow.flowStatesTagsetTemplate ||
      !innovationFlow.flowStatesTagsetTemplate.tagsets
    ) {
      throw new RelationshipNotFoundException(
        `Unable to find flowStatesTagsetTemplate on InnovationFlow: ${innovationFlow.id}`,
        LogContext.INNOVATION_FLOW
      );
    }
    const tagsetsToUpdate = innovationFlow.flowStatesTagsetTemplate.tagsets;
    // Update the tagset Template

    const updatedTagsetTemplateData: UpdateTagsetTemplateDefinitionInput = {
      allowedValues,
      defaultSelectedValue,
    };
    await this.tagsetTemplateService.updateTagsetTemplateDefinition(
      innovationFlow.flowStatesTagsetTemplate,
      updatedTagsetTemplateData
    );

    // Update all tagsets using the tagset template
    await this.tagsetService.updateTagsetsSelectedValue(
      tagsetsToUpdate,
      allowedValues,
      defaultSelectedValue
    );
  }

  async updateSelectedState(
    innovationFlowSelectedStateData: UpdateInnovationFlowSelectedStateInput
  ): Promise<IInnovationFlow> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowSelectedStateData.innovationFlowID,
      {
        relations: { profile: true, flowStatesTagsetTemplate: true },
      }
    );
    const newSelectedState = innovationFlow.states.find(
      s => s.displayName === innovationFlowSelectedStateData.selectedState
    );
    if (!newSelectedState) {
      throw new ValidationException(
        `Unable to find selected state '${innovationFlowSelectedStateData.selectedState}' in existing set of state names: ${this.innovationFlowStateService.getStateNames(
          innovationFlow.states
        )}`,
        LogContext.INNOVATION_FLOW
      );
    }
    innovationFlow.currentState = newSelectedState;

    return await this.save(innovationFlow);
  }

  async updateSingleState(
    updateData: UpdateInnovationFlowSingleStateInput,
    isTemplate: boolean = false
  ): Promise<IInnovationFlow> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      updateData.innovationFlowID,
      {
        relations: {
          profile: true,
          flowStatesTagsetTemplate: {
            tagsets: true,
          },
        },
      }
    );

    // First update the states definition
    const stateToUpdate = innovationFlow.states.find(
      s => s.displayName === updateData.stateDisplayName
    );
    if (!stateToUpdate) {
      throw new ValidationException(
        `Unable to find '${
          updateData.stateDisplayName
        }' in existing set of state names: ${this.innovationFlowStateService.getStateNames(
          innovationFlow.states
        )}`,
        LogContext.INNOVATION_FLOW
      );
    }
    const newStates: IInnovationFlowState[] = [];
    for (const state of innovationFlow.states) {
      if (state.displayName === updateData.stateDisplayName) {
        state.displayName = updateData.stateUpdatedData.displayName;
        state.description = updateData.stateUpdatedData.description || '';
      }
      newStates.push(state);
    }
    return await this.updateInnovationFlowStates(
      innovationFlow,
      newStates,
      isTemplate
    );
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
    const innovationFlow = await this.innovationFlowRepository.findOne({
      where: { id: innovationFlowID },
      ...options,
    });

    if (!innovationFlow)
      throw new EntityNotFoundException(
        `Unable to find InnovationFlow with ID: ${innovationFlowID}`,
        LogContext.INNOVATION_FLOW
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
        LogContext.INNOVATION_FLOW
      );

    return innovationFlow.profile;
  }

  public async getFlowTagsetTemplate(
    innovationFlowInput: IInnovationFlow,
    relations?: FindOptionsRelations<IInnovationFlow>
  ): Promise<ITagsetTemplate> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowInput.id,
      {
        relations: { flowStatesTagsetTemplate: true, ...relations },
      }
    );
    if (!innovationFlow.flowStatesTagsetTemplate)
      throw new EntityNotFoundException(
        `InnovationFlow profile not initialised: ${innovationFlow.id}`,
        LogContext.INNOVATION_FLOW
      );

    return innovationFlow.flowStatesTagsetTemplate;
  }

  public validateInnovationFlowDefinition(
    states: CreateInnovationFlowStateInput[] | UpdateInnovationFlowStateInput[]
  ) {
    this.innovationFlowStateService.validateDefinition(states);
  }
}
