import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IActivityLogEntryBase } from './activity.log.dto.entry.base.interface';
import { IActivityLogEntry } from './activity.log.entry.interface';

@ObjectType('ActivityLogEntryCalloutPublished', {
  implements: () => [IActivityLogEntry],
})
export abstract class IActivityLogEntryCalloutPublished
  extends IActivityLogEntryBase
  implements IActivityLogEntry
{
  @Field(() => ICallout, {
    nullable: false,
    description: 'The Callout that was published.',
  })
  callout!: ICallout;
}
