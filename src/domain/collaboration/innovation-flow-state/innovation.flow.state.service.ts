import { LogContext } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { CalloutDescriptionDisplayMode } from '@common/enums/callout.description.display.mode';
import { TemplateType } from '@common/enums/template.type';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { Template } from '@domain/template/template/template.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { CreateInnovationFlowStateInput } from './dto/innovation.flow.state.dto.create';
import { UpdateInnovationFlowStateInput } from './dto/innovation.flow.state.dto.update';
import { InnovationFlowState } from './innovation.flow.state.entity';
import { IInnovationFlowState } from './innovation.flow.state.interface';

@Injectable()
export class InnovationFlowStateService {
  constructor(
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
    innovationFlowState.displayName = updateData.displayName;
    innovationFlowState.description = updateData.description ?? '';
    if (updateData.settings) {
      // Both flags are optional, non-destructive partial updates: an explicit
      // value (including `false`) is honored; omission preserves the stored
      // value.
      if (updateData.settings.allowNewCallouts !== undefined) {
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
    }

    return await this.save(innovationFlowState);
  }

  async delete(state: IInnovationFlowState): Promise<IInnovationFlowState> {
    const result = await this.innovationFlowStateRepository.remove(
      state as InnovationFlowState
    );
    result.id = state.id; // Preserve the ID for consistency
    return result;
  }

  async getInnovationFlowStateOrFail(
    innovationFlowStateID: string,
    options?: FindOneOptions<InnovationFlowState>
  ): Promise<IInnovationFlowState | never> {
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
    // FR-001 / research Decision 2: non-nullable GraphQL fields on settings.
    // The backfill migration guarantees every persisted row carries them, but
    // coerce defensively here so any un-backfilled row — or a row with missing
    // settings — still resolves to a value rather than null (risk R-4).
    if (!innovationFlowState.settings) {
      innovationFlowState.settings = {
        allowNewCallouts: true,
        visible: true,
        descriptionDisplayMode: CalloutDescriptionDisplayMode.EXPANDED,
        showPublishDetails: true,
      };
    } else {
      innovationFlowState.settings.visible =
        innovationFlowState.settings.visible ?? true;
      // FR-001/021: coerce absent descriptionDisplayMode to EXPANDED.
      innovationFlowState.settings.descriptionDisplayMode =
        innovationFlowState.settings.descriptionDisplayMode ??
        CalloutDescriptionDisplayMode.EXPANDED;
      // FR-002/021: coerce absent showPublishDetails to true.
      innovationFlowState.settings.showPublishDetails =
        innovationFlowState.settings.showPublishDetails ?? true;
    }
    return innovationFlowState;
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
    const flowState = await this.getInnovationFlowStateOrFail(flowStateID);

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

    (flowState as InnovationFlowState).defaultCalloutTemplate = template;
    await this.innovationFlowStateRepository.save(
      flowState as InnovationFlowState
    );

    this.logger.verbose?.(
      `Set default callout template on flow state: ${flowStateID}`,
      LogContext.COLLABORATION
    );

    return flowState;
  }

  async removeDefaultCalloutTemplate(
    flowStateID: string
  ): Promise<IInnovationFlowState> {
    const flowState = await this.getInnovationFlowStateOrFail(flowStateID);

    (flowState as InnovationFlowState).defaultCalloutTemplate = null;
    await this.innovationFlowStateRepository.save(
      flowState as InnovationFlowState
    );

    this.logger.verbose?.(
      `Removed default callout template from flow state: ${flowStateID}`,
      LogContext.COLLABORATION
    );

    return flowState;
  }
}
