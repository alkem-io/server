import DataLoader from 'dataloader';
import { Injectable } from '@nestjs/common';
import { ProfileDataloaderService } from '@domain/community/profile/profile.dataloader.service';
import { IVisual } from '@domain/common/visual';
import { DataLoaderCreator } from '../data.loader.interface';
import { UserService } from '@domain/community/user/user.service';
import { UserDataloaderService } from '@domain/community/user/user.dataloader.service';
import { IAgent } from '@src/domain';

@Injectable()
export class UserAgentLoader implements DataLoaderCreator<IAgent> {
  constructor(private readonly userService: UserDataloaderService) {}

  create() {
    return new DataLoader<string, IAgent>(keys =>
      this.userService.findAgentsByBatch(keys as string[])
    );
  }
}
