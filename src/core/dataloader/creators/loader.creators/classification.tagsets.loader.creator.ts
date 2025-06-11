import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { ITagset } from '@domain/common/tagset';
import { createTypedRelationDataLoader } from '../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';
import { Classification } from '@domain/common/classification/classification.entity';

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
