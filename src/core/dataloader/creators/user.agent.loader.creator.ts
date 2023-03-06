import DataLoader from 'dataloader';
import { Injectable } from '@nestjs/common';
import { UserDataloaderService } from '@domain/community/user/user.dataloader.service';
import { IAgent } from '@src/domain';
import { DataLoaderCreator } from '../data.loader.creator';

@Injectable()
export class UserAgentLoaderCreator implements DataLoaderCreator<IAgent> {
  constructor(private readonly userService: UserDataloaderService) {}

  create() {
    return new DataLoader<string, IAgent>(keys =>
      this.userService.findAgentsByBatch(keys as string[])
    );
  }
}
