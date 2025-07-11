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
import { CreateInnovationFlowInput } from './dto/innovation.flow.dto.create';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileService } from '@domain/common/profile/profile.service';
import { VisualType } from '@common/enums/visual.type';
import { ITagsetTemplate } from '@domain/common/tagset-template/tagset.template.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { UpdateInnovationFlowSelectedStateInput } from './dto/innovation.flow.dto.state.select';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { CreateInnovationFlowStateInput } from '../innovation-flow-state/dto/innovation.flow.state.dto.create';
import { UpdateInnovationFlowStateInput } from '../innovation-flow-state/dto/innovation.flow.state.dto.update';
import { TagsetTemplateService } from '@domain/common/tagset-template/tagset.template.service';
import { UpdateTagsetTemplateDefinitionInput } from '@domain/common/tagset-template';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { InnovationFlowStateService } from '../innovation-flow-state/innovation.flow.state.service';
import { IInnovationFlowState } from '../innovation-flow-state/innovation.flow.state.interface';
import { IInnovationFlowSettings } from '../innovation-flow-settings/innovation.flow.settings.interface';
import { UpdateInnovationFlowInput } from './dto/innovation.flow.dto.update';

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

    this.validateInnovationFlowDefinition(
      innovationFlowData.states,
      innovationFlowData.settings
    );

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

    innovationFlow.states = [];
    for (const stateData of innovationFlowData.states) {
      const state =
        await this.innovationFlowStateService.createInnovationFlowState(
          stateData
        );
      innovationFlow.states.push(state);
    }

    innovationFlow.currentState = innovationFlow.states[0];

    return innovationFlow;
  }

  async save(innovationFlow: IInnovationFlow): Promise<IInnovationFlow> {
    return await this.innovationFlowRepository.save(innovationFlow);
  }

  async updateInnovationFlow(
    innovationFlowData: UpdateInnovationFlowInput
  ): Promise<IInnovationFlow> {
    const innovationFlow = await this.getInnovationFlowOrFail(
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

  public async createStateOnInnovationFlow(
    innovationFlow: IInnovationFlow,
    stateData: CreateInnovationFlowStateInput
  ): Promise<IInnovationFlowState> {
    const maximumNumberOfStates = innovationFlow.settings.maximumNumberOfStates;
    if (!innovationFlow.states) {
      throw new RelationshipNotFoundException(
        `Unable to find states on InnovationFlow: ${innovationFlow.id}`,
        LogContext.INNOVATION_FLOW
      );
    }
    if (innovationFlow.states.length >= maximumNumberOfStates) {
      throw new ValidationException(
        `Innovation Flow can have a maximum of ${maximumNumberOfStates} states; provided: ${innovationFlow.states.length}`,
        LogContext.INNOVATION_FLOW
      );
    }
    const state =
      await this.innovationFlowStateService.createInnovationFlowState(
        stateData
      );
    state.innovationFlow = innovationFlow;
    return await this.innovationFlowStateService.save(state);
  }

  public validateInnovationFlowDefinition(
    states: CreateInnovationFlowStateInput[] | UpdateInnovationFlowStateInput[],
    settings?: IInnovationFlowSettings
  ) {
    if (states.length === 0) {
      throw new ValidationException(
        `At least one state must be defined: ${states}`,
        LogContext.INNOVATION_FLOW
      );
    }
    if (settings) {
      if (states.length > settings.maximumNumberOfStates) {
        throw new ValidationException(
          `Innovation Flow can have a maximum of ${settings.maximumNumberOfStates} states; provided: ${states}`,
          LogContext.INNOVATION_FLOW
        );
      }

      if (states.length < settings.minimumNumberOfStates) {
        throw new ValidationException(
          `Innovation Flow must have a minimum of ${settings.minimumNumberOfStates} states; provided: ${states}`,
          LogContext.INNOVATION_FLOW
        );
      }
    }
    const stateNames = states.map(state => state.displayName);
    const uniqueStateNames = new Set(stateNames);
    if (uniqueStateNames.size !== stateNames.length) {
      throw new ValidationException(
        `State names must be unique: ${stateNames}`,
        LogContext.INNOVATION_FLOW
      );
    }
    // Avoid commas in state names, because they are used to separate states in the database
    // This validation is also performed on the client: domain/collaboration/InnovationFlow/InnovationFlowDragNDropEditor/InnovationFlowStateForm.tsx
    // Keep them in sync consistently
    if (stateNames.some(name => name.includes(','))) {
      throw new ValidationException(
        `Invalid characters found on flow state: ${stateNames}`,
        LogContext.INNOVATION_FLOW
      );
    }
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
    const newSelectedState =
      await this.innovationFlowStateService.getInnovationFlowStateOrFail(
        innovationFlowSelectedStateData.selectedStateID
      );

    // Check it is part of the current flow states!
    if (
      !innovationFlow.states.some(state => state.id === newSelectedState.id)
    ) {
      throw new ValidationException(
        `Selected state '${newSelectedState.displayName}' is not part of the current flow states: ${innovationFlow.states.map(
          state => state.displayName
        )}`,
        LogContext.INNOVATION_FLOW
      );
    }

    innovationFlow.currentState = newSelectedState;

    return await this.save(innovationFlow);
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
}
