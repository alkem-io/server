import { IAspect } from '@domain/collaboration';
import { ICallout } from '@domain/collaboration/callout';
import { Field, ObjectType } from '@nestjs/graphql';
import { IActivityLogEntryBase } from './activity.log.dto.entry.base.interface';
import { IActivityLogEntry } from './activity.log.entry.interface';

@ObjectType('ActivityLogEntryCalloutCardComment', {
  implements: () => [IActivityLogEntry],
})
export abstract class IActivityLogEntryCalloutCardComment
  extends IActivityLogEntryBase
  implements IActivityLogEntry
{
  @Field(() => ICallout, {
    nullable: false,
    description: 'The Callout in which the Card was commented.',
  })
  callout!: ICallout;

  @Field(() => IAspect, {
    nullable: false,
    description: 'The Card that was commented on.',
  })
  card!: IAspect;
}
