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

@Injectable()
export class InnovationFlowStateService {
  constructor(
    @InjectRepository(InnovationFlowState)
    private innovationFlowRepository: Repository<InnovationFlowState>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createInnovationFlow(
    stateData: CreateInnovationFlowStateInput
  ): Promise<IInnovationFlowState> {
    const innovationFlowState: IInnovationFlowState =
      InnovationFlowState.create();
    innovationFlowState.displayName = stateData.displayName;
    innovationFlowState.description = stateData.description || '';
    innovationFlowState.settings = {
      someFlag: true,
    };
    innovationFlowState.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.INNOVATION_FLOW_STATE
    );

    return innovationFlowState;
  }

  async save(
    innovationFlowState: IInnovationFlowState
  ): Promise<IInnovationFlowState> {
    return await this.innovationFlowRepository.save(innovationFlowState);
  }

  async getInnovationFlowStateOrFail(
    innovationFlowID: string,
    options?: FindOneOptions<InnovationFlowState>
  ): Promise<IInnovationFlowState | never> {
    const innovationFlow = await this.innovationFlowRepository.findOne({
      where: { id: innovationFlowID },
      ...options,
    });

    if (!innovationFlow)
      throw new EntityNotFoundException(
        `Unable to find InnovationFlowState with ID: ${innovationFlowID}`,
        LogContext.INNOVATION_FLOW
      );
    return innovationFlow;
  }
}
