import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { ISpace } from '@domain/space/space/space.interface';
import { Inject, Injectable } from '@nestjs/common';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class AccountSpacesLoaderCreator implements DataLoaderCreator<ISpace[]> {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  create(options: DataLoaderCreatorOptions<ISpace[]>) {
    return createTypedRelationDataLoader(
      this.db,
      'accounts',
      { spaces: true },
      this.constructor.name,
      options
    );
  }
}
