import DataLoader from 'dataloader';
import { Injectable } from '@nestjs/common';
import { UserDataloaderService } from '@domain/community/user/user.dataloader.service';
import { IAgent } from '@src/domain';
import { DataLoaderCreator } from './base/data.loader.creator';
import { DataLoaderCreatorOptions } from '@core/dataloader/creators/base';

@Injectable()
export class UserAgentLoaderCreator implements DataLoaderCreator<IAgent> {
  constructor(private readonly userService: UserDataloaderService) {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  create(options?: DataLoaderCreatorOptions) {
    return new DataLoader<string, IAgent>(keys =>
      this.userService.findAgentsByBatch(keys as string[])
    );
  }
}
