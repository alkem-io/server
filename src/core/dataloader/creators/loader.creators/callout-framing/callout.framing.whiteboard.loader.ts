import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';
import { CalloutFraming } from '@domain/collaboration/callout-framing/callout.framing.entity';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';

@Injectable()
export class CalloutFramingWhiteboardLoaderCreator
  implements DataLoaderCreator<IWhiteboard>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IWhiteboard>) {
    return createTypedRelationDataLoader(
      this.manager,
      CalloutFraming,
      { whiteboard: true },
      this.constructor.name,
      options
    );
  }
}
