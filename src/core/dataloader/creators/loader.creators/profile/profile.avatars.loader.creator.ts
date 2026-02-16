import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { createTypedRelationDataLoader } from '@core/dataloader/utils';
import { IVisual } from '@domain/common/visual';
import { Inject, Injectable } from '@nestjs/common';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class ProfileAvatarsLoaderCreator implements DataLoaderCreator<IVisual> {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  create(options: DataLoaderCreatorOptions<IVisual>) {
    return createTypedRelationDataLoader(
      this.db,
      'profiles',
      { avatar: true },
      this.constructor.name,
      options
    );
  }
}
