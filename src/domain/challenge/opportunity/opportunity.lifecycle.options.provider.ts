import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MachineOptions } from 'xstate';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { OpportunityService } from './opportunity.service';
import {
  IOpportunity,
  OpportunityLifecycleEventInput,
} from '@domain/challenge/opportunity';

@Injectable()
export class OpportunityLifecycleOptionsProvider {
  constructor(
    private lifecycleService: LifecycleService,
    private opportunityService: OpportunityService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async eventOnOpportunity(
    opportunityEventData: OpportunityLifecycleEventInput
  ): Promise<IOpportunity> {
    const opportunityID = opportunityEventData.ID;
    const lifecycle = await this.opportunityService.getLifecycle(opportunityID);

    // Send the event, translated if needed
    this.logger.verbose?.(
      `Event ${opportunityEventData.eventName} triggered on opportunity: ${opportunityID} using lifecycle ${lifecycle.id}`,
      LogContext.COMMUNITY
    );
    await this.lifecycleService.event(
      {
        ID: lifecycle.id,
        eventName: opportunityEventData.eventName,
      },
      this.opportunityLifecycleMachineOptions
    );

    return await this.opportunityService.getOpportunityByIdOrFail(
      opportunityID
    );
  }

  private opportunityLifecycleMachineOptions: Partial<
    MachineOptions<any, any>
  > = {
    actions: {
      sampleEvent: async (_, event: any) => {
        const opportunity = await this.opportunityService.getOpportunityOrFail(
          event.parentID,
          {
            relations: ['community'],
          }
        );
        this.logger.verbose?.(
          `Command triggered on opportunity: ${opportunity.id}`,
          LogContext.CHALLENGES
        );
      },
    },
  };
}
