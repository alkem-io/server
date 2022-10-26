import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { ICanvas } from '@domain/common/canvas/canvas.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IActivityLogEntryBase } from './activity.log.dto.entry.base.interface';
import { IActivityLogEntry } from './activity.log.entry.interface';

@ObjectType('ActivityLogEntryCalloutCanvasCreated', {
  implements: () => [IActivityLogEntry],
})
export abstract class IActivityLogEntryCalloutCanvasCreated
  extends IActivityLogEntryBase
  implements IActivityLogEntry
{
  @Field(() => ICallout, {
    nullable: false,
    description: 'The Callout in which the Canvas was created.',
  })
  callout!: ICallout;

  @Field(() => ICanvas, {
    nullable: false,
    description: 'The Canvas that was created.',
  })
  canvas!: ICanvas;
}
