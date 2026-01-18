import { LogContext, ProfileType } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { VisualType } from '@common/enums/visual.type';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileService } from '@domain/common/profile/profile.service';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { UpdateTagsetTemplateDefinitionInput } from '@domain/common/tagset-template';
import { ITagsetTemplate } from '@domain/common/tagset-template/tagset.template.interface';
import { TagsetTemplateService } from '@domain/common/tagset-template/tagset.template.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { keyBy } from 'lodash';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import { CalloutsSetService } from '../callouts-set/callouts.set.service';
import { Collaboration } from '../collaboration/collaboration.entity';
import { IInnovationFlowSettings } from '../innovation-flow-settings/innovation.flow.settings.interface';
import { CreateInnovationFlowStateInput } from '../innovation-flow-state/dto/innovation.flow.state.dto.create';
import { UpdateInnovationFlowStateInput } from '../innovation-flow-state/dto/innovation.flow.state.dto.update';
import { IInnovationFlowState } from '../innovation-flow-state/innovation.flow.state.interface';
import { InnovationFlowStateService } from '../innovation-flow-state/innovation.flow.state.service';
import { sortBySortOrder } from '../innovation-flow-state/utils/sortBySortOrder';
import { CreateInnovationFlowInput } from './dto/innovation.flow.dto.create';
import { DeleteStateOnInnovationFlowInput } from './dto/innovation.flow.dto.state.delete';
import { UpdateInnovationFlowCurrentStateInput } from './dto/innovation.flow.dto.state.select';
import { UpdateInnovationFlowInput } from './dto/innovation.flow.dto.update';
import { UpdateInnovationFlowStatesSortOrderInput } from './dto/innovation.flow.dto.update.states.sort.order';
import { InnovationFlow } from './innovation.flow.entity';
import { IInnovationFlow } from './innovation.flow.interface';

@Injectable()
export class InnovationFlowService {
  constructor(
    private profileService: ProfileService,
    private tagsetService: TagsetService,
    private tagsetTemplateService: TagsetTemplateService,
    private innovationFlowStateService: InnovationFlowStateService,
    private calloutsSetService: CalloutsSetService,
    @InjectRepository(InnovationFlow)
    private innovationFlowRepository: Repository<InnovationFlow>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createInnovationFlow(
    innovationFlowData: CreateInnovationFlowInput,
    storageAggregator: IStorageAggregator,
    flowTagsetTemplate: ITagsetTemplate
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

    innovationFlow.flowStatesTagsetTemplate = flowTagsetTemplate;

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
    let sortOrder = 0;
    for (const stateData of innovationFlowData.states) {
      if (!stateData.sortOrder) {
        stateData.sortOrder = sortOrder + 5;
      }
      const state =
        await this.innovationFlowStateService.createInnovationFlowState(
          stateData
        );
      innovationFlow.states.push(state);
      sortOrder = state.sortOrder;
    }
    await this.save(innovationFlow);

    innovationFlow.currentStateID = innovationFlow.states[0].id;
    if (innovationFlowData.currentStateDisplayName) {
      const currentState = innovationFlow.states.find(
        state =>
          state.displayName === innovationFlowData.currentStateDisplayName
      );
      if (currentState) {
        innovationFlow.currentStateID = currentState.id;
      }
    }

    return await this.save(innovationFlow);
  }

  async save(innovationFlow: IInnovationFlow): Promise<IInnovationFlow> {
    return await this.innovationFlowRepository.save(innovationFlow);
  }

  /**
   * Updates the profile information of the InnovationFlow.
   */
  async updateInnovationFlow(
    innovationFlowData: UpdateInnovationFlowInput
  ): Promise<IInnovationFlow> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowData.innovationFlowID,
      {
        relations: {
          profile: true,
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

  /**
   * Updates a single state of the InnovationFlow.
   * Updates the tagset template for the flow states.
   * Updates also the callouts classification if the flow states tagset template is used.
   * @param innovationFlow
   * @param stateUpdatedData
   */
  public async updateInnovationFlowState(
    innovationFlowId: string,
    stateUpdatedData: UpdateInnovationFlowStateInput
  ): Promise<IInnovationFlowState> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowId,
      {
        relations: {
          flowStatesTagsetTemplate: {
            tagsets: true,
          },
          states: true,
        },
      }
    );

    const states = innovationFlow.states.sort(sortBySortOrder);
    const currentStateID = innovationFlow.currentStateID;

    let updatedState = states.find(
      state => state.id === stateUpdatedData.innovationFlowStateID
    );
    if (!updatedState) {
      throw new EntityNotFoundException(
        'Unable to find InnovationFlowState in InnovationFlow',
        LogContext.INNOVATION_FLOW,
        {
          innovationFlowID: innovationFlow.id,
          innovationFlowStateID: stateUpdatedData.innovationFlowStateID,
        }
      );
    }
    const renamedState =
      updatedState.displayName !== stateUpdatedData.displayName
        ? { old: updatedState.displayName, new: stateUpdatedData.displayName }
        : undefined;

    // Update the state with the new data
    updatedState = await this.innovationFlowStateService.update(
      updatedState,
      stateUpdatedData
    );

    // Generate the new tagset template definition
    if (renamedState && innovationFlow.flowStatesTagsetTemplate) {
      const allowedValues = states.map(state => state.displayName);
      const defaultSelectedValue =
        states.find(state => state.id === currentStateID)?.displayName ??
        states[0]?.displayName ??
        '';

      await this.tagsetTemplateService.updateTagsetTemplateDefinition(
        innovationFlow.flowStatesTagsetTemplate,
        {
          allowedValues,
          defaultSelectedValue,
        }
      );
      if (innovationFlow.flowStatesTagsetTemplate.tagsets) {
        await this.tagsetService.updateTagsetsSelectedValue(
          innovationFlow.flowStatesTagsetTemplate.tagsets,
          allowedValues,
          defaultSelectedValue,
          renamedState
        );
      }
    }
    await this.save(innovationFlow);

    return updatedState;
  }

  /**
   * Warning: Drops all the existing states and creates new ones.
   *    This is normally used when applying a template
   *    Updates the tagset template for the flow states and updates the callouts classification??
   * @param innovationFlow
   * @param newStates
   * @returns
   */
  public async updateInnovationFlowStates(
    innovationFlow: IInnovationFlow,
    newStates: CreateInnovationFlowStateInput[]
  ) {
    // Get the name of the currently selected as current state
    const selectedStateName = innovationFlow.currentStateID
      ? (await this.getCurrentState(innovationFlow.currentStateID))?.displayName
      : undefined;

    // delete the existing states
    for (const state of innovationFlow.states) {
      await this.innovationFlowStateService.delete(state);
    }
    innovationFlow.states = [];
    // create the new states
    for (const stateData of newStates) {
      const state =
        await this.innovationFlowStateService.createInnovationFlowState(
          stateData
        );
      state.innovationFlow = innovationFlow;
      innovationFlow.states.push(state);
    }

    // Needs to save the innovation flow to persist the states and be able to access their ids
    innovationFlow = await this.save(innovationFlow);

    // Check if there is a matching name to update the current state ID
    let currentState = innovationFlow.states.find(
      state => state.displayName === selectedStateName
    );
    if (!currentState) {
      // If the current state is not valid, set it to the first state
      currentState = innovationFlow.states[0];
    }
    innovationFlow.currentStateID = currentState.id;

    innovationFlow = await this.save(innovationFlow);

    const tagsetAllowedValues = newStates
      .sort(sortBySortOrder)
      .map(state => state.displayName);

    const tagsetDefaultSelectedValue = currentState.displayName;
    await this.updateFlowStatesTagsetTemplate(
      innovationFlow.id,
      tagsetAllowedValues,
      tagsetDefaultSelectedValue
    );

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
    // If order is not specified, set it to the next highest
    if (!stateData.sortOrder) {
      stateData.sortOrder =
        innovationFlow.states.length > 0
          ? Math.max(...innovationFlow.states.map(state => state.sortOrder)) + 1
          : 1;
    }

    const state =
      await this.innovationFlowStateService.createInnovationFlowState(
        stateData
      );
    state.innovationFlow = innovationFlow;
    return await this.innovationFlowStateService.save(state);
  }

  public async deleteStateOnInnovationFlow(
    innovationFlow: IInnovationFlow,
    stateData: DeleteStateOnInnovationFlowInput
  ): Promise<IInnovationFlowState> {
    const minimum = innovationFlow.settings.minimumNumberOfStates;
    if (!innovationFlow.states) {
      throw new RelationshipNotFoundException(
        `Unable to find states on InnovationFlow: ${innovationFlow.id}`,
        LogContext.INNOVATION_FLOW
      );
    }
    if (innovationFlow.states.length <= minimum) {
      throw new ValidationException(
        `Innovation Flow must have a minimum of ${minimum} states; current: ${innovationFlow.states.length}`,
        LogContext.INNOVATION_FLOW
      );
    }

    const stateBeingDeleted = innovationFlow.states.find(
      s => s.id === stateData.ID
    );
    if (!stateBeingDeleted) {
      throw new EntityNotInitializedException(
        `Unable to find state with ID ${stateData.ID} in innovation flow ${innovationFlow.id}`,
        LogContext.INNOVATION_FLOW
      );
    }

    try {
      const collaboration = await this.getCollaborationByInnovationFlowId(
        innovationFlow.id
      );

      if (collaboration.calloutsSet) {
        const calloutsSetWithCallouts =
          await this.calloutsSetService.getCalloutsSetOrFail(
            collaboration.calloutsSet.id,
            {
              relations: {
                callouts: {
                  classification: {
                    tagsets: true,
                  },
                },
              },
            }
          );

        const callouts = calloutsSetWithCallouts.callouts || [];

        // Get only the callouts that are assigned to this specific state.displayName
        const calloutsInDeletedState = callouts.filter(callout => {
          if (!callout.classification || !callout.classification.tagsets) {
            return false;
          }

          const flowStateTagset = callout.classification.tagsets.find(
            tagset => tagset.name === TagsetReservedName.FLOW_STATE
          );

          if (
            !flowStateTagset ||
            !flowStateTagset.tags ||
            flowStateTagset.tags.length !== 1
          ) {
            return false;
          }

          const currentFlowState = flowStateTagset.tags[0];

          // Match callouts assigned to the state being deleted
          return currentFlowState === stateBeingDeleted.displayName;
        });

        // Get the remaining valid flow state names (excluding the one being deleted)
        const validFlowStateNames = innovationFlow.states
          .filter(s => s.id !== stateData.ID)
          .sort(sortBySortOrder)
          .map(s => s.displayName);

        if (
          validFlowStateNames.length > 0 &&
          calloutsInDeletedState.length > 0
        ) {
          this.calloutsSetService.moveCalloutsToDefaultFlowState(
            validFlowStateNames,
            calloutsInDeletedState
          );

          // Save the entire callouts set to persist all callout changes
          await this.calloutsSetService.save(calloutsSetWithCallouts);
        }
      }
    } catch (error) {
      throw new ValidationException(
        `Failed to move all posts, try again or move them manually. ${error}`,
        LogContext.INNOVATION_FLOW
      );
    }

    // Delete the state AFTER moving callouts
    const state: IInnovationFlowState =
      await this.innovationFlowStateService.getInnovationFlowStateOrFail(
        stateData.ID
      );

    const deletedInnovationFlowState =
      await this.innovationFlowStateService.delete(state);

    deletedInnovationFlowState.id = stateData.ID;
    return deletedInnovationFlowState;
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

  async updateCurrentState(
    innovationFlowSelectedStateData: UpdateInnovationFlowCurrentStateInput
  ): Promise<IInnovationFlow> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowSelectedStateData.innovationFlowID,
      {
        relations: {
          profile: true,
          flowStatesTagsetTemplate: true,
          states: true,
        },
      }
    );
    const newSelectedCurrentState =
      await this.innovationFlowStateService.getInnovationFlowStateOrFail(
        innovationFlowSelectedStateData.currentStateID
      );

    // Check it is part of the current flow states!
    if (
      !innovationFlow.states.some(
        state => state.id === newSelectedCurrentState.id
      )
    ) {
      throw new ValidationException(
        `Selected state '${newSelectedCurrentState.displayName}' is not part of the current flow states: ${innovationFlow.states.map(
          state => state.displayName
        )}`,
        LogContext.INNOVATION_FLOW
      );
    }

    innovationFlow.currentStateID = newSelectedCurrentState.id;

    return await this.save(innovationFlow);
  }

  async deleteInnovationFlow(
    innovationFlowID: string
  ): Promise<IInnovationFlow> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowID,
      {
        relations: {
          profile: true,
          states: true,
        },
      }
    );
    if (!innovationFlow.states || !innovationFlow.profile) {
      throw new RelationshipNotFoundException(
        `Unable to find states or profile on InnovationFlow: ${innovationFlow.id}`,
        LogContext.INNOVATION_FLOW
      );
    }

    await this.profileService.deleteProfile(innovationFlow.profile.id);
    for (const state of innovationFlow.states) {
      await this.innovationFlowStateService.delete(state);
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

  public async getStates(
    innovationFlowID: string
  ): Promise<IInnovationFlowState[]> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowID,
      {
        relations: { states: { defaultCalloutTemplate: true } },
      }
    );
    if (!innovationFlow.states) {
      throw new EntityNotFoundException(
        `InnovationFlow States not initialised: ${innovationFlow.id}`,
        LogContext.INNOVATION_FLOW
      );
    }

    // sort the states by sortOrder
    return innovationFlow.states.sort(sortBySortOrder);
  }

  public async getCurrentState(
    innovationFlowStateID: string
  ): Promise<IInnovationFlowState> {
    return await this.innovationFlowStateService.getInnovationFlowStateOrFail(
      innovationFlowStateID
    );
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

  public async updateStatesSortOrder(
    innovationFlowID: string,
    sortOrderData: UpdateInnovationFlowStatesSortOrderInput
  ): Promise<IInnovationFlowState[]> {
    const innovationFlow = await this.getInnovationFlowOrFail(
      innovationFlowID,
      {
        relations: { states: true },
      }
    );
    if (!innovationFlow.states) {
      throw new EntityNotInitializedException(
        'InnovationFlow not initialised, missing states',
        LogContext.COLLABORATION,
        { innovationFlowID }
      );
    }

    const allStates = innovationFlow.states;

    const statesByID = {
      ...keyBy(allStates, 'id'),
    };

    if (sortOrderData.stateIDs.some(stateID => !statesByID[stateID])) {
      throw new EntityNotFoundException(
        'One or more states with requested IDs not located in the specified InnovationFlow',
        LogContext.INNOVATION_FLOW,
        { innovationFlowID }
      );
    }

    const sortOrders = sortOrderData.stateIDs.map(
      stateID => statesByID[stateID].sortOrder
    );

    const minimumSortOrder =
      sortOrders.length > 0 ? Math.min(...sortOrders) : 0;
    const modifiedStates: IInnovationFlowState[] = [];

    // Get the callouts specified
    const statesInOrder: IInnovationFlowState[] = [];
    let newSortOrder = minimumSortOrder + 10;
    for (const stateID of sortOrderData.stateIDs) {
      const state = statesByID[stateID];

      statesInOrder.push(state);
      state.sortOrder = newSortOrder;
      modifiedStates.push(state);

      newSortOrder += 10; // Increment sort order for the next state
    }

    await this.innovationFlowStateService.saveAll(modifiedStates);

    return statesInOrder;
  }

  private async getCollaborationByInnovationFlowId(innovationFlowId: string) {
    // Query to find collaboration that contains this innovation flow
    const collaborationRepository =
      this.innovationFlowRepository.manager.getRepository(Collaboration);

    const collaborationResult = await collaborationRepository.findOne({
      where: {
        innovationFlow: { id: innovationFlowId },
      },
      relations: {
        calloutsSet: true,
        innovationFlow: true,
      },
    });

    if (!collaborationResult) {
      throw new RelationshipNotFoundException(
        `Unable to find collaboration for InnovationFlow: ${innovationFlowId}`,
        LogContext.INNOVATION_FLOW
      );
    }

    return collaborationResult;
  }
}
