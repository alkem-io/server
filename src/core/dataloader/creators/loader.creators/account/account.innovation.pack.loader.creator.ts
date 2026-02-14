import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { Inject, Injectable } from '@nestjs/common';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class AccountInnovationPacksLoaderCreator
  implements DataLoaderCreator<IInnovationPack[]>
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  create(options: DataLoaderCreatorOptions<IInnovationPack[]>) {
    return createTypedRelationDataLoader(
      this.db,
      'accounts',
      { innovationPacks: true },
      this.constructor.name,
      options
    );
  }
}
