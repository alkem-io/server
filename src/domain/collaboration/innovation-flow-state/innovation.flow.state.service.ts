import { LogContext } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { CalloutDescriptionDisplayMode } from '@common/enums/callout.description.display.mode';
import { TemplateType } from '@common/enums/template.type';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Template } from '@domain/template/template/template.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager, FindOneOptions, Repository } from 'typeorm';
import { CreateInnovationFlowStateInput } from './dto/innovation.flow.state.dto.create';
import { UpdateInnovationFlowStateInput } from './dto/innovation.flow.state.dto.update';
import { InnovationFlowState } from './innovation.flow.state.entity';
import { IInnovationFlowState } from './innovation.flow.state.interface';
import { SIDEBAR_DEFAULT_GENERIC } from './innovation.flow.state.sidebar.defaults';
import { normalizeStateSettings } from './normalize.state.settings';
import { withRawSidebar } from './utils/withRawSidebar';

@Injectable()
export class InnovationFlowStateService {
  constructor(
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(InnovationFlowState)
    private innovationFlowStateRepository: Repository<InnovationFlowState>,
    @InjectRepository(Template)
    private templateRepository: Repository<Template>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async createInnovationFlowState(
    stateData: CreateInnovationFlowStateInput
  ): Promise<IInnovationFlowState> {
    const innovationFlowState: IInnovationFlowState =
      InnovationFlowState.create();
    innovationFlowState.displayName = stateData.displayName;
    innovationFlowState.description = stateData.description || '';
    innovationFlowState.settings = {
      allowNewCallouts: true,
      // FR-005: new phases default to visible. Honor an explicit create-time
      // `visible: false`; the existing `allowNewCallouts: true` default is
      // intentionally left untouched (consuming create-time allowNewCallouts is
      // out of scope for story #6138).
      visible: stateData.settings?.visible ?? true,
      // FR-001/021: descriptionDisplayMode defaults to EXPANDED; honor explicit create-time value.
      descriptionDisplayMode:
        stateData.settings?.descriptionDisplayMode ??
        CalloutDescriptionDisplayMode.EXPANDED,
      // FR-002/021: showPublishDetails defaults to true; honor explicit create-time value.
      showPublishDetails: stateData.settings?.showPublishDetails ?? true,
      // Honors an explicit create-time sidebar list verbatim (the leg that carries template
      // save/apply through unchanged); defaults to the generic composition otherwise. This is
      // the one funnel every state-creation path goes through, so it also covers the create
      // paths that never send `settings` at all.
      sidebar: stateData.settings?.sidebar
        ? [...stateData.settings.sidebar]
        : [...SIDEBAR_DEFAULT_GENERIC],
    };
    innovationFlowState.sortOrder = stateData.sortOrder ?? 0;
    innovationFlowState.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.INNOVATION_FLOW_STATE
    );

    return innovationFlowState;
  }

  async save(
    innovationFlowState: IInnovationFlowState
  ): Promise<IInnovationFlowState> {
    return await this.innovationFlowStateRepository.save(innovationFlowState);
  }

  saveAll(
    innovationFlowStates: IInnovationFlowState[]
  ): Promise<IInnovationFlowState[]> {
    return this.innovationFlowStateRepository.save(innovationFlowStates);
  }

  async update(
    innovationFlowState: IInnovationFlowState,
    updateData: UpdateInnovationFlowStateInput
  ): Promise<IInnovationFlowState> {
    // FR-013: every field of this mutation is a non-destructive partial update. Omission
    // (or an explicit null) preserves the stored value, so a client editing only `settings`
    // cannot clobber a concurrent rename or description edit it never saw.
    if (updateData.displayName != null) {
      innovationFlowState.displayName = updateData.displayName;
    }
    // `!= null`, not `?? ''`: omitting `description` must preserve it, not wipe it.
    // Clearing a description still works — an explicit '' is not null.
    if (updateData.description != null) {
      innovationFlowState.description = updateData.description;
    }
    if (updateData.settings) {
      // Both flags are optional, non-destructive partial updates: an explicit
      // value (including `false`) is honored; omission preserves the stored
      // value.
      if (updateData.settings.allowNewCallouts != null) {
        innovationFlowState.settings.allowNewCallouts =
          updateData.settings.allowNewCallouts;
      }
      // FR-002/FR-009: `visible` is an optional, non-destructive partial update.
      // An explicit value (including `false`) is honored; omission preserves the
      // stored value. `visible` is independent of `allowNewCallouts`.
      // FR-006/FR-007: this update path is already gated by the innovation-flow
      // UPDATE privilege (see innovation.flow.resolver.mutations.ts); `visible`
      // is a navigation hint only and is never read by authorization or content
      // access logic.
      // `!= null` (not `!== undefined`): these settings fields are non-nullable, but the
      // GraphQL inputs are nullable, so a client can send an explicit `null`. Guarding on
      // `!= null` skips both `undefined` (omitted → preserve) AND `null` (never overwrite a
      // NonNull field, which would otherwise make the mutation's own response fail to serialize).
      if (updateData.settings.visible != null) {
        innovationFlowState.settings.visible = updateData.settings.visible;
      }
      // FR-001/021: partial update for descriptionDisplayMode — omission/null preserves stored value.
      if (updateData.settings.descriptionDisplayMode != null) {
        innovationFlowState.settings.descriptionDisplayMode =
          updateData.settings.descriptionDisplayMode;
      }
      // FR-002/021: partial update for showPublishDetails — omission/null preserves stored value.
      if (updateData.settings.showPublishDetails != null) {
        innovationFlowState.settings.showPublishDetails =
          updateData.settings.showPublishDetails;
      }
      // Partial update for sidebar — omission/null preserves the stored list; an explicit
      // array (including `[]`) replaces it wholesale. Validated (enum, no duplicates, size
      // bound) upstream by the DTO before it reaches this service.
      if (updateData.settings.sidebar != null) {
        innovationFlowState.settings.sidebar = [...updateData.settings.sidebar];
      }
    }

    return await this.save(innovationFlowState);
  }

  async delete(state: IInnovationFlowState): Promise<IInnovationFlowState> {
    if (state.authorization) {
      await this.authorizationPolicyService.delete(state.authorization);
    }
    const result = await this.innovationFlowStateRepository.remove(
      state as InnovationFlowState
    );
    result.id = state.id; // Preserve the ID for consistency
    return result;
  }

  /**
   * Deletes a state whose sidebar list must survive on another state: used when the FIRST
   * state of a subspace (L1/L2) flow is deleted, because the first state's list is the whole
   * subspace's sidebar. The deleted state's RAW stored list (never read-normalized; an absent
   * key stays absent) is copied onto the inheritor — and nothing else from its settings — and
   * the copy and the delete commit in one transaction, so a failed copy never leaves the
   * subspace showing the next state's list.
   *
   * The inheritor is read inside the transaction and only its `settings` column is written,
   * so every other setting is the value stored at that moment rather than a stale copy taken
   * before the transaction began. `persistAlongside` runs first in the same transaction, for
   * writes that must commit or roll back together with the delete.
   */
  async deleteWithSidebarInheritance(
    deletedStateID: string,
    inheritorStateID: string,
    persistAlongside?: (entityManager: EntityManager) => Promise<unknown>
  ): Promise<IInnovationFlowState> {
    const deleted = await this.getRawInnovationFlowStateOrFail(deletedStateID);

    const removed =
      await this.innovationFlowStateRepository.manager.transaction(
        async entityManager => {
          await persistAlongside?.(entityManager);
          const inheritor = await entityManager.findOne(InnovationFlowState, {
            where: { id: inheritorStateID },
          });
          if (!inheritor) {
            throw new EntityNotFoundException(
              'Unable to find InnovationFlowState to inherit the sidebar',
              LogContext.INNOVATION_FLOW,
              { innovationFlowStateID: inheritorStateID }
            );
          }
          await entityManager.update(
            InnovationFlowState,
            { id: inheritorStateID },
            {
              settings: withRawSidebar(
                inheritor.settings,
                deleted.settings?.sidebar
              ),
            }
          );
          if (deleted.authorization) {
            await this.authorizationPolicyService.delete(
              deleted.authorization,
              entityManager
            );
          }
          return entityManager.remove(InnovationFlowState, deleted);
        }
      );
    removed.id = deletedStateID; // Preserve the ID for consistency
    // The removed row is detached from the database, so normalizing it for the API
    // response cannot persist anything.
    return normalizeStateSettings(removed);
  }

  async getInnovationFlowStateOrFail(
    innovationFlowStateID: string,
    options?: FindOneOptions<InnovationFlowState>
  ): Promise<IInnovationFlowState | never> {
    return normalizeStateSettings(
      await this.getRawInnovationFlowStateOrFail(innovationFlowStateID, options)
    );
  }

  /**
   * Loads the state WITHOUT read-path normalization. Write paths that
   * repository.save() the loaded entity for an unrelated change MUST use this
   * loader: normalization strips out-of-vocabulary sidebar values for the API
   * response only, and saving a normalized entity would persist that filtering
   * (rolling-deploy hazard — an older node whose enum lacks a newly added
   * widget would silently delete it from the DB for everyone).
   */
  private async getRawInnovationFlowStateOrFail(
    innovationFlowStateID: string,
    options?: FindOneOptions<InnovationFlowState>
  ): Promise<InnovationFlowState | never> {
    const innovationFlowState =
      await this.innovationFlowStateRepository.findOne({
        where: { id: innovationFlowStateID },
        ...options,
      });

    if (!innovationFlowState)
      throw new EntityNotFoundException(
        `Unable to find InnovationFlowState with ID: ${innovationFlowStateID}`,
        LogContext.INNOVATION_FLOW
      );
    return innovationFlowState;
  }

  /**
   * Normalizes a DETACHED copy of the state for the API response, leaving the
   * raw entity (and its settings object) untouched — so nothing that later
   * saves the raw entity can persist the read-path filtering.
   */
  private toNormalizedApiState(
    state: InnovationFlowState
  ): IInnovationFlowState {
    return normalizeStateSettings({
      ...state,
      settings: state.settings
        ? structuredClone(state.settings)
        : state.settings,
    });
  }

  public getStateNames(states: IInnovationFlowState[]): string[] {
    return states.map(state => state.displayName);
  }

  async getDefaultCalloutTemplate(
    flowStateID: string
  ): Promise<Template | null> {
    const flowState = await this.innovationFlowStateRepository.findOne({
      where: { id: flowStateID },
      relations: ['defaultCalloutTemplate'],
    });

    return flowState?.defaultCalloutTemplate ?? null;
  }

  async setDefaultCalloutTemplate(
    flowStateID: string,
    templateID: string
  ): Promise<IInnovationFlowState> {
    // Raw load, NOT getInnovationFlowStateOrFail: this path saves the entity, and it
    // must persist the stored settings verbatim (see getRawInnovationFlowStateOrFail).
    const flowState = await this.getRawInnovationFlowStateOrFail(flowStateID);

    // Fetch template directly to avoid circular dependency with TemplateService
    const templates = await this.templateRepository.find({
      where: { id: templateID },
    });

    if (!templates || templates.length === 0) {
      throw new EntityNotFoundException(
        'Template not found',
        LogContext.COLLABORATION,
        { templateID }
      );
    }

    const template = templates[0];

    if (template.type !== TemplateType.CALLOUT) {
      this.logger.warn?.(
        `Attempt to set non-CALLOUT template as default for flow state: ${flowStateID}`,
        LogContext.COLLABORATION
      );

      throw new ValidationException(
        'Template must be of type CALLOUT',
        LogContext.COLLABORATION,
        { templateID, templateType: template.type }
      );
    }

    flowState.defaultCalloutTemplate = template;
    await this.innovationFlowStateRepository.save(flowState);

    this.logger.verbose?.(
      `Set default callout template on flow state: ${flowStateID}`,
      LogContext.COLLABORATION
    );

    return this.toNormalizedApiState(flowState);
  }

  async removeDefaultCalloutTemplate(
    flowStateID: string
  ): Promise<IInnovationFlowState> {
    // Raw load, NOT getInnovationFlowStateOrFail: this path saves the entity, and it
    // must persist the stored settings verbatim (see getRawInnovationFlowStateOrFail).
    const flowState = await this.getRawInnovationFlowStateOrFail(flowStateID);

    flowState.defaultCalloutTemplate = null;
    await this.innovationFlowStateRepository.save(flowState);

    this.logger.verbose?.(
      `Removed default callout template from flow state: ${flowStateID}`,
      LogContext.COLLABORATION
    );

    return this.toNormalizedApiState(flowState);
  }
}
