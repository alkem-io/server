import { Classification } from '@domain/common/classification/classification.entity';
import { ITagset } from '@domain/common/tagset';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { createTypedRelationDataLoader } from '../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';

@Injectable()
export class ClassificationTagsetsLoaderCreator
  implements DataLoaderCreator<ITagset[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options: DataLoaderCreatorOptions<ITagset[]>) {
    return createTypedRelationDataLoader(
      this.manager,
      Classification,
      { tagsets: true },
      this.constructor.name,
      options
    );
  }
}
