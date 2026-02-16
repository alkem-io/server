import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { Inject, Injectable } from '@nestjs/common';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class CalloutFramingWhiteboardLoaderCreator
  implements DataLoaderCreator<IWhiteboard>
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  create(options: DataLoaderCreatorOptions<IWhiteboard>) {
    return createTypedRelationDataLoader(
      this.db,
      'calloutFramings',
      { whiteboard: true },
      this.constructor.name,
      options
    );
  }
}
