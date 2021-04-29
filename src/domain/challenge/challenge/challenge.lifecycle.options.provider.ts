import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MachineOptions } from 'xstate';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { ChallengeEventInput, IChallenge } from '@domain/challenge/challenge';
import { ChallengeService } from './challenge.service';

@Injectable()
export class ChallengeLifecycleOptionsProvider {
  constructor(
    private lifecycleService: LifecycleService,
    private challengeService: ChallengeService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async eventOnChallenge(
    challengeEventData: ChallengeEventInput
  ): Promise<IChallenge> {
    const challengeID = challengeEventData.ID;
    const lifecycle = await this.challengeService.getLifecycle(challengeID);

    // Send the event, translated if needed
    this.logger.verbose?.(
      `Event ${challengeEventData.eventName} triggered on challenge: ${challengeID} using lifecycle ${lifecycle.id}`,
      LogContext.COMMUNITY
    );
    await this.lifecycleService.event(
      {
        ID: lifecycle.id,
        eventName: challengeEventData.eventName,
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
        const challenge = await this.challengeService.getChallengeOrFail(
          event.parentID,
          {
            relations: ['community'],
          }
        );
        this.logger.verbose?.(
          `Command triggered on challenge: ${challenge.id}`,
          LogContext.CHALLENGES
        );
      },
    },
  };
}
