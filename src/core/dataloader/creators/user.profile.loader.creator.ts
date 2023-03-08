import DataLoader from 'dataloader';
import { Injectable } from '@nestjs/common';
import { UserDataloaderService } from '@domain/community/user/user.dataloader.service';
import { IProfile } from '@src/domain';
import { DataLoaderCreator, DataLoaderCreatorOptions } from './base';

@Injectable()
export class UserProfileLoaderCreator implements DataLoaderCreator<IProfile> {
  constructor(private readonly userService: UserDataloaderService) {}

  create(options?: DataLoaderCreatorOptions<IProfile>) {
    return new DataLoader<string, IProfile>(
      keys => this.userService.findProfilesByBatch(keys as string[]),
      {
        cache: options?.cache,
        name: 'UserProfileLoaderCreator',
      }
    );
  }
}
