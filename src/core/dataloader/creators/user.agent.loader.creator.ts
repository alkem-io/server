import DataLoader from 'dataloader';
import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { IAgent, User } from '@src/domain';
import { InjectRepository } from '@nestjs/typeorm';
import { findByBatchIds } from '../utils/findByBatchIds';
import { DataLoaderCreator, DataLoaderCreatorOptions } from './base';

@Injectable()
export class UserAgentLoaderCreator implements DataLoaderCreator<IAgent> {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) {}

  create(options?: DataLoaderCreatorOptions<IAgent>) {
    return new DataLoader<string, IAgent>(
      keys =>
        findByBatchIds<User, IAgent>(
          this.userRepository,
          keys as string[],
          'agent'
        ),
      {
        cache: options?.cache,
        name: 'UserAgentLoaderCreator',
      }
    );
  }
}
