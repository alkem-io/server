import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IActivityLogEntryBase } from './activity.log.dto.entry.base.interface';
import { IActivityLogEntry } from './activity.log.entry.interface';

@ObjectType('ActivityLogEntryCalloutWhiteboardContentModified', {
  implements: () => [IActivityLogEntry],
})
export abstract class IActivityLogEntryCalloutWhiteboardContentModified
  extends IActivityLogEntryBase
  implements IActivityLogEntry
{
  @Field(() => ICallout, {
    nullable: false,
    description: 'The Callout in which the Whiteboard was updated.',
  })
  callout!: ICallout;

  @Field(() => IWhiteboard, {
    nullable: false,
    description: 'The Whiteboard that was updated.',
  })
  whiteboard!: IWhiteboard;
}
