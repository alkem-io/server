import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { MachineOptions } from 'xstate';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { BaseChallengeService } from './base.challenge.service';
import { Repository } from 'typeorm';
import { BaseChallenge, IBaseChallenge } from '@domain/challenge';
import { BaseChallengeEventInput } from './base.challenge.dto.event';
import { ValidationException } from '@common/exceptions';

@Injectable()
export class BaseChallengeLifecycleOptionsProvider {
  constructor(
    private lifecycleService: LifecycleService,
    private baseChallengeService: BaseChallengeService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async eventOnBaseChallenge(
    eventData: BaseChallengeEventInput
  ): Promise<IBaseChallenge> {
    const baseChallengeID = eventData.ID;
    const eventRepository = eventData.repository;
    if (!eventRepository)
      throw new ValidationException(
        `Event missing required repository: ${baseChallengeID}`,
        LogContext.CHALLENGES
      );
    const lifecycle = await this.baseChallengeService.getLifecycle(
      baseChallengeID,
      eventRepository
    );

    // Send the event, translated if needed
    this.logger.verbose?.(
      `Event ${eventData.eventName} triggered on base challenge: ${baseChallengeID} using lifecycle ${lifecycle.id}`,
      LogContext.COMMUNITY
    );
    await this.lifecycleService.event(
      {
        ID: lifecycle.id,
        eventName: eventData.eventName,
        repository: eventRepository,
      },
      this.challengeLifecycleMachineOptions
    );

    return await this.baseChallengeService.getChallengeBaseByIdOrFail(
      baseChallengeID,
      eventRepository
    );
  }

  private challengeLifecycleMachineOptions: Partial<
    MachineOptions<any, any>
  > = {
    actions: {
      sampleEvent: async (_, event: any) => {
        const repository: Repository<BaseChallenge> = event.repository;
        const challenge = await this.baseChallengeService.getChallengeBaseOrFail(
          event.parentID,
          repository,
          {
            relations: ['community'],
          }
        );
        this.logger.verbose?.(
          `Command triggered on base challenge: ${challenge.id}`,
          LogContext.CHALLENGES
        );
      },
    },
  };
}
