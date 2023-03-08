import DataLoader from 'dataloader';
import { Injectable } from '@nestjs/common';
import { UserDataloaderService } from '@domain/community/user/user.dataloader.service';
import { IAgent } from '@src/domain';
import { DataLoaderCreator, DataLoaderCreatorOptions } from './base';

@Injectable()
export class UserAgentLoaderCreator implements DataLoaderCreator<IAgent> {
  constructor(private readonly userService: UserDataloaderService) {}

  create(options?: DataLoaderCreatorOptions<IAgent>) {
    return new DataLoader<string, IAgent>(
      keys => this.userService.findAgentsByBatch(keys as string[]),
      {
        cache: options?.cache,
        name: 'UserAgentLoaderCreator',
        cacheMap: null,
      }
    );
  }
}
