import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { ICollaboration } from '@domain/collaboration/collaboration';
import { createTypedDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class ChallengeCollaborationLoaderCreator
  implements DataLoaderCreator<ICollaboration>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<ICollaboration>) {
    return createTypedDataLoader(
      this.manager,
      Challenge,
      'collaboration',
      this.constructor.name,
      options
    );
  }
}
