import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { IAgent } from '@src/domain';
import { createTypedDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';

@Injectable()
export class ChallengeAgentLoaderCreator implements DataLoaderCreator<IAgent> {
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IAgent>) {
    return createTypedDataLoader(
      this.manager,
      Challenge,
      'agent',
      this.constructor.name,
      options
    );
  }
}
