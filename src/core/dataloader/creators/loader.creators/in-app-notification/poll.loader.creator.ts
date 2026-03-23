import { EntityNotFoundException } from '@common/exceptions';
import {
  DataLoaderCreator,
  DataLoaderCreatorBaseOptions,
} from '@core/dataloader/creators/base';
import { ILoader } from '@core/dataloader/loader.interface';
import { createBatchLoader } from '@core/dataloader/utils';
import { Poll } from '@domain/collaboration/poll/poll.entity';
import { IPoll } from '@domain/collaboration/poll/poll.interface';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, In } from 'typeorm';

@Injectable()
export class PollLoaderCreator implements DataLoaderCreator<IPoll> {
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  public create(
    options?: DataLoaderCreatorBaseOptions<any, any>
  ): ILoader<IPoll | null | EntityNotFoundException> {
    return createBatchLoader(this.pollInBatch, {
      name: this.constructor.name,
      loadedTypeName: Poll.name,
      resolveToNull: options?.resolveToNull,
    });
  }

  private pollInBatch = (keys: ReadonlyArray<string>): Promise<Poll[]> => {
    return this.manager.findBy(Poll, { id: In(keys) });
  };
}
