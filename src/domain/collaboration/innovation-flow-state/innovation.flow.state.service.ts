import { LogContext } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { TemplateType } from '@common/enums/template.type';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { Template } from '@domain/template/template/template.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { eq } from 'drizzle-orm';
import { innovationFlowStates } from './innovation.flow.state.schema';
import { CreateInnovationFlowStateInput } from './dto/innovation.flow.state.dto.create';
import { UpdateInnovationFlowStateInput } from './dto/innovation.flow.state.dto.update';
import { InnovationFlowState } from './innovation.flow.state.entity';
import { IInnovationFlowState } from './innovation.flow.state.interface';

@Injectable()
export class InnovationFlowStateService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
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
    const [result] = await this.db
      .insert(innovationFlowStates)
      .values(innovationFlowState as any)
      .onConflictDoUpdate({
        target: innovationFlowStates.id,
        set: innovationFlowState as any,
      })
      .returning();
    return result as unknown as IInnovationFlowState;
  }

  async saveAll(
    innovationFlowStates: IInnovationFlowState[]
  ): Promise<IInnovationFlowState[]> {
    const results: IInnovationFlowState[] = [];
    for (const state of innovationFlowStates) {
      const saved = await this.save(state);
      results.push(saved);
    }
    return results;
  }

  async update(
    innovationFlowState: IInnovationFlowState,
    updateData: UpdateInnovationFlowStateInput
  ): Promise<IInnovationFlowState> {
    innovationFlowState.displayName = updateData.displayName;
    innovationFlowState.description = updateData.description ?? '';
    if (updateData.settings) {
      innovationFlowState.settings.allowNewCallouts =
        updateData.settings.allowNewCallouts;
    }

    return await this.save(innovationFlowState);
  }

  async delete(state: IInnovationFlowState): Promise<IInnovationFlowState> {
    await this.db
      .delete(innovationFlowStates)
      .where(eq(innovationFlowStates.id, state.id));
    const result = { ...state };
    result.id = state.id; // Preserve the ID for consistency
    return result as IInnovationFlowState;
  }

  async getInnovationFlowStateOrFail(
    innovationFlowStateID: string
  ): Promise<IInnovationFlowState | never> {
    const innovationFlowState = await this.db.query.innovationFlowStates.findFirst({
      where: eq(innovationFlowStates.id, innovationFlowStateID),
      with: {
        authorization: true,
        defaultCalloutTemplate: true,
        innovationFlow: true,
      },
    }) as unknown as IInnovationFlowState;

    if (!innovationFlowState)
      throw new EntityNotFoundException(
        `Unable to find InnovationFlowState with ID: ${innovationFlowStateID}`,
        LogContext.INNOVATION_FLOW
      );
    return innovationFlowState;
  }

  public getStateNames(states: IInnovationFlowState[]): string[] {
    return states.map(state => state.displayName);
  }

  async getDefaultCalloutTemplate(
    flowStateID: string
  ): Promise<Template | null> {
    const flowState = await this.db.query.innovationFlowStates.findFirst({
      where: eq(innovationFlowStates.id, flowStateID),
      with: {
        defaultCalloutTemplate: true,
      },
    });

    return (flowState?.defaultCalloutTemplate as Template | undefined) ?? null;
  }

  async setDefaultCalloutTemplate(
    flowStateID: string,
    templateID: string
  ): Promise<IInnovationFlowState> {
    const flowState = await this.getInnovationFlowStateOrFail(flowStateID);

    // Fetch template directly to avoid circular dependency with TemplateService
    const template = await this.db.query.templates.findFirst({
      where: eq(innovationFlowStates.id, templateID),
    });

    if (!template) {
      throw new EntityNotFoundException(
        'Template not found',
        LogContext.COLLABORATION,
        { templateID }
      );
    }

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

    await this.db
      .update(innovationFlowStates)
      .set({ defaultCalloutTemplateId: templateID })
      .where(eq(innovationFlowStates.id, flowStateID));

    this.logger.verbose?.(
      `Set default callout template on flow state: ${flowStateID}`,
      LogContext.COLLABORATION
    );

    return await this.getInnovationFlowStateOrFail(flowStateID);
  }

  async removeDefaultCalloutTemplate(
    flowStateID: string
  ): Promise<IInnovationFlowState> {
    await this.db
      .update(innovationFlowStates)
      .set({ defaultCalloutTemplateId: null })
      .where(eq(innovationFlowStates.id, flowStateID));

    this.logger.verbose?.(
      `Removed default callout template from flow state: ${flowStateID}`,
      LogContext.COLLABORATION
    );

    return await this.getInnovationFlowStateOrFail(flowStateID);
  }
}
