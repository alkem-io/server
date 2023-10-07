import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';
import { CalloutFraming } from '@domain/collaboration/callout-framing/callout.framing.entity';
import { IWhiteboardRt } from '@domain/common/whiteboard-rt/whiteboard.rt.interface';

@Injectable()
export class CalloutFramingWhiteboardRtLoaderCreator
  implements DataLoaderCreator<IWhiteboardRt>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IWhiteboardRt>) {
    return createTypedRelationDataLoader(
      this.manager,
      CalloutFraming,
      { whiteboardRt: true },
      this.constructor.name,
      options
    );
  }
}
