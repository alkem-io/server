import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IActivityLogEntryBase } from './activity.log.dto.entry.base.interface';
import { IActivityLogEntry } from './activity.log.entry.interface';

@ObjectType('ActivityLogEntryCalloutWhiteboardCreated', {
  implements: () => [IActivityLogEntry],
})
export abstract class IActivityLogEntryCalloutWhiteboardCreated
  extends IActivityLogEntryBase
  implements IActivityLogEntry
{
  @Field(() => ICallout, {
    nullable: false,
    description: 'The Callout in which the Whiteboard was created.',
  })
  callout!: ICallout;

  @Field(() => IWhiteboard, {
    nullable: false,
    description: 'The Whiteboard that was created.',
  })
  whiteboard!: IWhiteboard;
}
