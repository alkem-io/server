import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { IAgent, User } from '@src/domain';
import { createTypedDataLoader } from '../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';

@Injectable()
export class UserAgentLoaderCreator implements DataLoaderCreator<IAgent> {
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IAgent>) {
    return createTypedDataLoader(
      this.manager,
      User,
      { agent: true },
      this.constructor.name,
      options
    );
  }
}
