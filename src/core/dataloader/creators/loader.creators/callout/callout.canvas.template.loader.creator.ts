import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Callout } from '@domain/collaboration/callout';
import { ICanvasTemplate } from '@domain/template/canvas-template/canvas.template.interface';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class CalloutCanvasTemplateLoaderCreator
  implements DataLoaderCreator<ICanvasTemplate>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<ICanvasTemplate>) {
    return createTypedRelationDataLoader(
      this.manager,
      Callout,
      { canvasTemplate: true },
      this.constructor.name,
      options
    );
  }
}
