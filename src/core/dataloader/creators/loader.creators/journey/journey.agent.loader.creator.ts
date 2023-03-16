import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { IAgent } from '@src/domain';
import { createTypedDataLoader } from '@core/dataloader/utils';
import { DataLoaderInitError } from '@common/exceptions/data-loader';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';

@Injectable()
export class JourneyAgentLoaderCreator implements DataLoaderCreator<IAgent> {
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IAgent, BaseChallenge>) {
    if (!options?.parentClassRef) {
      throw new DataLoaderInitError(
        'This data loader requires the "parentClassRef" to be provided.'
      );
    }

    return createTypedDataLoader(
      this.manager,
      options.parentClassRef,
      { agent: true },
      this.constructor.name,
      options
    );
  }
}
