import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MachineOptions } from 'xstate';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { ChallengeService } from './challenge.service';
import { ChallengeEventInput, IChallenge } from '@domain/challenge/challenge';

@Injectable()
export class ChallengeLifecycleOptionsProvider {
  constructor(
    private lifecycleService: LifecycleService,
    private challengeService: ChallengeService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async eventOnChallenge(eventData: ChallengeEventInput): Promise<IChallenge> {
    const challengeID = eventData.ID;

    const lifecycle = await this.challengeService.getLifecycle(challengeID);

    // Send the event, translated if needed
    this.logger.verbose?.(
      `Event ${eventData.eventName} triggered on Opportunity: ${challengeID} using lifecycle ${lifecycle.id}`,
      LogContext.COMMUNITY
    );
    await this.lifecycleService.event(
      {
        ID: lifecycle.id,
        eventName: eventData.eventName,
      },
      this.challengeLifecycleMachineOptions
    );

    return await this.challengeService.getChallengeByIdOrFail(challengeID);
  }

  private challengeLifecycleMachineOptions: Partial<
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
