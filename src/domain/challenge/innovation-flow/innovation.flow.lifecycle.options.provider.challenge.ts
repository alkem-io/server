import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MachineOptions } from 'xstate';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { AgentInfo } from '@core/authentication';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { InnovationFlowService } from './innovaton.flow.service';
import { IInnovationFlow } from './innovation.flow.interface';
import { InnovationFlowEvent } from './dto/innovation.flow.dto.event';

@Injectable()
export class InnovationFlowLifecycleOptionsProviderChallenge {
  constructor(
    private authorizationService: AuthorizationService,
    private lifecycleService: LifecycleService,
    private innovationFlowService: InnovationFlowService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async eventOnChallenge(
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
      this.challengeLifecycleMachineOptions,
      agentInfo,
      innovationFlow.authorization
    );

    return await this.innovationFlowService.getInnovationFlowOrFail(
      innovationFlowID
    );
  }

  private challengeLifecycleMachineOptions: Partial<MachineOptions<any, any>> =
    {
      actions: {
        sampleEvent: async (_, event: any) => {
          this.logger.verbose?.(
            `Command triggered on Opportunity with event: ${event.type}`,
            LogContext.CHALLENGES
          );
        },
      },
      guards: {
        challengeStateUpdateAuthorized: (_, event) => {
          const agentInfo: AgentInfo = event.agentInfo;
          const authorizationPolicy: AuthorizationPolicy = event.authorization;
          const stateChangeAllowed = this.authorizationService.isAccessGranted(
            agentInfo,
            authorizationPolicy,
            AuthorizationPrivilege.UPDATE
          );
          return stateChangeAllowed;
        },
      },
    };
}
