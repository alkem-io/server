import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MachineOptions } from 'xstate';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { AgentInfo } from '@core/authentication';
import { InnovationFlowService } from './innovaton.flow.service';
import { InnovationFlowEvent } from './dto/innovation.flow.dto.event';
import { IInnovationFlow } from './innovation.flow.interface';

@Injectable()
export class InnovationFlowLifecycleOptionsProviderOpportunity {
  constructor(
    private lifecycleService: LifecycleService,
    private innovationFlowService: InnovationFlowService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async eventOnOpportunity(
    eventData: InnovationFlowEvent,
    agentInfo: AgentInfo
  ): Promise<IInnovationFlow> {
    const innovationFlowID = eventData.innovationFlowID;
    const innovationFlow =
      await this.innovationFlowService.getInnovationFlowOrFail(
        innovationFlowID
      );

    const lifecycle = await this.innovationFlowService.getLifecycle(
      innovationFlowID
    );

    // Send the event, translated if needed
    this.logger.verbose?.(
      `Event ${eventData.eventName} triggered on InnovationFlow: ${innovationFlowID} using lifecycle ${lifecycle.id}`,
      LogContext.CHALLENGES
    );
    await this.lifecycleService.event(
      {
        ID: lifecycle.id,
        eventName: eventData.eventName,
      },
      this.opportunityLifecycleMachineOptions,
      agentInfo,
      innovationFlow.authorization
    );

    await this.innovationFlowService.updateStatesTagsetTemplateToMatchLifecycle(
      innovationFlowID
    );

    return await this.innovationFlowService.getInnovationFlowOrFail(
      innovationFlowID
    );
  }

  private opportunityLifecycleMachineOptions: Partial<
    MachineOptions<any, any>
  > = {
    actions: {
      sampleEvent: async (_, event: any) => {
        this.logger.verbose?.(
          `Command triggered on Opportunity with event: ${event.type}`,
          LogContext.CHALLENGES
        );
      },
    },
  };
}
