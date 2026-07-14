import { LogContext, ProfileType } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { SpaceLevel } from '@common/enums/space.level';
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
import { Space } from '@domain/space/space/space.entity';
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
import { normalizeStatesSettings } from '../innovation-flow-state/normalize.state.settings';
import { sortBySortOrder } from '../innovation-flow-state/utils/sortBySortOrder';
import { CreateInnovationFlowInput } from './dto/innovation.flow.dto.create';
import { DeleteStateOnInnovationFlowInput } from './dto/innovation.flow.dto.state.delete';
import { UpdateInnovationFlowCurrentStateInput } from './dto/innovation.flow.dto.state.select';
import { UpdateInnovationFlowInput } from './dto/innovation.flow.dto.update';
import { UpdateInnovationFlowStatesSortOrderInput } from './dto/innovation.flow.dto.update.states.sort.order';
import { L0_FIXED_INNOVATION_FLOW_STATES } from './innovation.flow.constants';
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

    // Phase 1: build entity tree in memory (no file-service-go calls).
    innovationFlow.profile = await this.profileService.createProfile(
      innovationFlowData.profile,
      ProfileType.INNOVATION_FLOW,
      storageAggregator
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

    // First save populates state ids; pick currentStateID from saved states.
    let saved = await this.save(innovationFlow);
    saved.currentStateID = saved.states[0].id;
    if (innovationFlowData.currentStateDisplayName) {
      const currentState = saved.states.find(
        state =>
          state.displayName === innovationFlowData.currentStateDisplayName
      );
      if (currentState) {
        saved.currentStateID = currentState.id;
      }
    }
    saved = await this.save(saved);

    // Phase 2: materialize via the shared helper. Rolls back on failure.
    saved.profile =
      await this.profileService.materializeProfileContentAndVisualsOrRollback(
        saved.profile,
        innovationFlowData.profile?.visuals,
        [VisualType.CARD],
        () => this.deleteInnovationFlow(saved.id)
      );
    return saved;
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

    const states = [...innovationFlow.states].sort(sortBySortOrder);
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
    // displayName is an optional partial update: only validate/rename when supplied.
    const newDisplayName = stateUpdatedData.displayName;
    if (newDisplayName != null) {
      // Reject comma-containing names on rename (commas are reserved separators)
      this.validateStateDisplayNames([newDisplayName]);
      // Reject a rename that collides with another state. Posts are joined to their phase
      // by display name, so duplicates make that join ambiguous: the settings of whichever
      // phase sorts first would silently apply to both.
      this.validateStateDisplayNameIsUnique(
        newDisplayName,
        states,
        updatedState.id
      );
    }

    const renamedState =
      newDisplayName != null && updatedState.displayName !== newDisplayName
        ? { old: updatedState.displayName, new: newDisplayName }
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
  /**
   * Applies a set of template states to an InnovationFlow when a Space Template
   * is applied (story #6177).
   *
   * For an L0 (root) space the first {@link L0_FIXED_INNOVATION_FLOW_STATES}
   * "fixed phases" MUST NOT be overridden (FR-008): they are preserved by
   * identity and leading order, and only the template's *additional* states
   * (those not duplicating a fixed-phase name) are appended, capped at the
   * flow's `maximumNumberOfStates`. If the combined unique set would exceed the
   * maximum the apply is rejected atomically (FR-009) before any mutation.
   *
   * For subspaces (L1/L2) behavior is unchanged: a wholesale replacement via
   * {@link updateInnovationFlowStates} (FR-011).
   */
  public async updateInnovationFlowStatesFromTemplate(
    innovationFlow: IInnovationFlow,
    templateStates: CreateInnovationFlowStateInput[]
  ) {
    const isLevelZero = await this.isLevelZeroInnovationFlow(innovationFlow.id);
    if (!isLevelZero) {
      // Subspace (or non-space) behavior is unchanged: replace all states.
      return this.updateInnovationFlowStates(innovationFlow, templateStates);
    }

    if (!innovationFlow.states) {
      throw new RelationshipNotFoundException(
        'Unable to find states on InnovationFlow',
        LogContext.INNOVATION_FLOW,
        { innovationFlowId: innovationFlow.id }
      );
    }

    // Preserve the leading fixed phases (by sort order) of the L0 space.
    const fixedStates = [...innovationFlow.states]
      .sort(sortBySortOrder)
      .slice(0, L0_FIXED_INNOVATION_FLOW_STATES);
    const fixedStateNames = new Set(
      fixedStates.map(state => state.displayName)
    );

    const fixedStateInputs: CreateInnovationFlowStateInput[] = fixedStates.map(
      state => ({
        displayName: state.displayName,
        description: state.description,
        settings: state.settings,
        sortOrder: state.sortOrder,
      })
    );

    // Append only the template states that do not duplicate a fixed phase name,
    // re-basing their sort order to come after the fixed phases.
    const additionalStateInputs: CreateInnovationFlowStateInput[] = [
      ...templateStates,
    ]
      .sort(sortBySortOrder)
      .filter(state => !fixedStateNames.has(state.displayName))
      .map((state, index) => ({
        ...state,
        sortOrder: L0_FIXED_INNOVATION_FLOW_STATES + index + 1,
      }));

    const combinedStates = [...fixedStateInputs, ...additionalStateInputs];

    const maximumNumberOfStates = innovationFlow.settings.maximumNumberOfStates;
    if (combinedStates.length > maximumNumberOfStates) {
      throw new ValidationException(
        'Applying this template would exceed the maximum number of states for this Space',
        LogContext.INNOVATION_FLOW,
        {
          innovationFlowId: innovationFlow.id,
          maximumNumberOfStates,
          resultingStateCount: combinedStates.length,
        }
      );
    }

    return this.updateInnovationFlowStates(innovationFlow, combinedStates);
  }

  /**
   * An InnovationFlow belongs to an L0 (root) space iff its owning Space has
   * `level === 0`. Resolved via the entity manager (no module coupling), mirroring
   * {@link getCollaborationByInnovationFlowId}. A flow with no owning Space row
   * (e.g. a template content space) is treated as non-L0.
   */
  private async isLevelZeroInnovationFlow(
    innovationFlowId: string
  ): Promise<boolean> {
    const spaceRepository =
      this.innovationFlowRepository.manager.getRepository(Space);
    const space = await spaceRepository.findOne({
      where: {
        collaboration: { innovationFlow: { id: innovationFlowId } },
      },
      select: { id: true, level: true },
    });
    return space?.level === SpaceLevel.L0;
  }

  public async updateInnovationFlowStates(
    innovationFlow: IInnovationFlow,
    newStates: CreateInnovationFlowStateInput[]
  ) {
    // Reject comma-containing names before rebuilding the states
    // (commas are reserved separators in the database)
    this.validateStateDisplayNames(newStates.map(state => state.displayName));

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

    const tagsetAllowedValues = [...newStates]
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
    // Reject comma-containing names before adding the state
    // (commas are reserved separators in the database)
    this.validateStateDisplayNames([stateData.displayName]);

    const maximumNumberOfStates = innovationFlow.settings.maximumNumberOfStates;
    if (!innovationFlow.states) {
      throw new RelationshipNotFoundException(
        `Unable to find states on InnovationFlow: ${innovationFlow.id}`,
        LogContext.INNOVATION_FLOW
      );
    }
    // Posts join to their phase by display name, so a duplicate makes that join ambiguous.
    this.validateStateDisplayNameIsUnique(
      stateData.displayName,
      innovationFlow.states
    );
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
    // On an update input, an omitted displayName means "leave unchanged", so it carries no
    // name to validate. Creation inputs always carry one.
    const stateNames = states
      .map(state => state.displayName)
      .filter((displayName): displayName is string => displayName != null);
    const uniqueStateNames = new Set(stateNames);
    if (uniqueStateNames.size !== stateNames.length) {
      throw new ValidationException(
        `State names must be unique: ${stateNames}`,
        LogContext.INNOVATION_FLOW
      );
    }
    this.validateStateDisplayNames(stateNames);
  }

  /**
   * Rejects flow state display names that contain a comma.
   *
   * Commas are reserved as the separator for flow state names in the database,
   * so any name containing one would corrupt that encoding. This must be
   * enforced on every path that persists a state name — creation *and* every
   * edit path (rebuild, add, rename) — otherwise invalid data can be saved on
   * edit and only surface later (e.g. when saving a space as a template).
   *
   * This validation is also performed on the client: domain/collaboration/InnovationFlow/InnovationFlowDragNDropEditor/InnovationFlowStateForm.tsx
   * Keep them in sync consistently.
   */
  public validateStateDisplayNames(stateNames: string[]) {
    if (stateNames.some(name => name.includes(','))) {
      throw new ValidationException(
        `Invalid characters found on flow state: ${stateNames}`,
        LogContext.INNOVATION_FLOW
      );
    }
  }

  /**
   * Rejects a state display name that collides with an existing state in the same flow.
   *
   * `validateInnovationFlowDefinition` enforces uniqueness when a flow is created, but the
   * incremental edit paths (rename, add state) bypassed it — so a flow could be edited into
   * a state that creating it from scratch would have rejected.
   *
   * Uniqueness is load-bearing, not cosmetic: a post resolves its presentation settings by
   * joining its flow-state classification on the phase *display name* (there is no stable
   * phase id in the classification). Two phases sharing a name make that join ambiguous.
   *
   * Comparison is case-insensitive and trims surrounding whitespace, matching the
   * collision check the client applies when adding a phase.
   *
   * @param excludeStateID the state being renamed, so it does not collide with itself
   */
  public validateStateDisplayNameIsUnique(
    displayName: string,
    existingStates: IInnovationFlowState[],
    excludeStateID?: string
  ) {
    const normalized = displayName.trim().toLowerCase();
    const collides = existingStates.some(
      state =>
        state.id !== excludeStateID &&
        state.displayName?.trim().toLowerCase() === normalized
    );
    if (collides) {
      throw new ValidationException(
        'A state with this display name already exists in the Innovation Flow',
        LogContext.INNOVATION_FLOW,
        { displayName }
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

    // sort the states by sortOrder, and normalize settings: these are raw TypeORM rows,
    // so an un-backfilled row would serialize null into the NonNull settings fields.
    return normalizeStatesSettings(
      [...innovationFlow.states].sort(sortBySortOrder)
    );
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

    // This mutation returns [IInnovationFlowState!]! straight from the raw rows.
    return normalizeStatesSettings(statesInOrder);
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
