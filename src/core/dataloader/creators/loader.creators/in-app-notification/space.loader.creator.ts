import { EntityNotFoundException } from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import {
  DataLoaderCreator,
  DataLoaderCreatorBaseOptions,
} from '@core/dataloader/creators/base';
import { ILoader } from '@core/dataloader/loader.interface';
import { createBatchLoader } from '@core/dataloader/utils';
import { ISpace } from '@domain/space/space/space.interface';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class SpaceLoaderCreator implements DataLoaderCreator<ISpace> {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  public create(
    options?: DataLoaderCreatorBaseOptions<any, any>
  ): ILoader<ISpace | null | EntityNotFoundException> {
    return createBatchLoader(this.spaceInBatch, {
      name: this.constructor.name,
      loadedTypeName: 'Space',
      resolveToNull: options?.resolveToNull,
    });
  }

  private spaceInBatch = async (keys: ReadonlyArray<string>): Promise<ISpace[]> => {
    return this.db.query.spaces.findMany({
      where: (table, { inArray }) => inArray(table.id, [...keys]),
    }) as unknown as Promise<ISpace[]>;
  };
}
