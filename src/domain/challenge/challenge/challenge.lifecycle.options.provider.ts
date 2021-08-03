import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MachineOptions } from 'xstate';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { ChallengeService } from './challenge.service';
import { ChallengeEventInput } from '@domain/challenge/challenge/dto/challenge.dto.event';
import { AgentInfo } from '@core/authentication';
import { AuthorizationDefinition } from '@domain/common/authorization-policy';
import { AuthorizationEngineService } from '@src/services/platform/authorization-engine/authorization-engine.service';
import { IChallenge } from './challenge.interface';

@Injectable()
export class ChallengeLifecycleOptionsProvider {
  constructor(
    private authorizationEngineService: AuthorizationEngineService,
    private lifecycleService: LifecycleService,
    private challengeService: ChallengeService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async eventOnChallenge(
    eventData: ChallengeEventInput,
    agentInfo: AgentInfo
  ): Promise<IChallenge> {
    const challengeID = eventData.ID;
    const challenge = await this.challengeService.getChallengeOrFail(
      challengeID,
      {
        relations: ['agent'],
      }
    );

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
      this.challengeLifecycleMachineOptions,
      agentInfo,
      challenge.authorization
    );

    return await this.challengeService.getChallengeOrFail(challengeID);
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
          const authorizationPolicy: AuthorizationDefinition =
            event.authorization;
          const stateChangeAllowed =
            this.authorizationEngineService.isAccessGranted(
              agentInfo,
              authorizationPolicy,
              AuthorizationPrivilege.UPDATE
            );
          // Todo: disabling the logic check for now to always return true
          if (!stateChangeAllowed) return true;
          return true;
        },
      },
    };
}
