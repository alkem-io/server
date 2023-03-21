import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { IVisual } from '@domain/common/visual';
import { Canvas } from '@domain/common/canvas';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class CanvasVisualLoaderCreator implements DataLoaderCreator<IVisual> {
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IVisual>) {
    return createTypedRelationDataLoader(
      this.manager,
      Canvas,
      { preview: true },
      this.constructor.name,
      options
    );
  }
}
