import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { InnovationFlowState } from './innovation.flow.state.entity';
import { CreateInnovationFlowStateInput } from './dto/innovation.flow.state.dto.create';
import { IInnovationFlowState } from './innovation.flow.state.interface';
import { UpdateInnovationFlowStateInput } from './dto/innovation.flow.state.dto.update';

@Injectable()
export class InnovationFlowStateService {
  constructor(
    @InjectRepository(InnovationFlowState)
    private innovationFlowStateRepository: Repository<InnovationFlowState>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
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
    innovationFlowState.description = updateData.description || '';
    if (updateData.settings) {
      innovationFlowState.settings.allowNewCallouts =
        updateData.settings.allowNewCallouts;
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
    return innovationFlowState;
  }

  public getStateNames(states: IInnovationFlowState[]): string[] {
    return states.map(state => state.displayName);
  }
}
