import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Callout } from '@domain/collaboration/callout';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';
import { IWhiteboardTemplate } from '@domain/template/whiteboard-template/whiteboard.template.interface';

@Injectable()
export class CalloutWhiteboardTemplateLoaderCreator
  implements DataLoaderCreator<IWhiteboardTemplate>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IWhiteboardTemplate>) {
    return createTypedRelationDataLoader(
      this.manager,
      Callout,
      { whiteboardTemplate: true },
      this.constructor.name,
      options
    );
  }
}
