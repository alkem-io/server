import { IAspect } from '@domain/collaboration/aspect/aspect.interface';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IActivityLogEntryBase } from './activity.log.dto.entry.base.interface';
import { IActivityLogEntry } from './activity.log.entry.interface';

@ObjectType('ActivityLogEntryCalloutCardCreated', {
  implements: () => [IActivityLogEntry],
})
export abstract class IActivityLogEntryCalloutCardCreated
  extends IActivityLogEntryBase
  implements IActivityLogEntry
{
  @Field(() => ICallout, {
    nullable: false,
    description: 'The Callout in which the Card was created.',
  })
  callout!: ICallout;

  @Field(() => IAspect, {
    nullable: false,
    description: 'The Card that was created.',
  })
  card!: IAspect;
}
