import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IActivityLogEntryBase } from './activity.log.dto.entry.base.interface';
import { IActivityLogEntry } from './activity.log.entry.interface';
import { IReference } from '@domain/common/reference/reference.interface';

@ObjectType('ActivityLogEntryCalloutLinkCreated', {
  implements: () => [IActivityLogEntry],
})
export abstract class IActivityLogEntryCalloutLinkCreated
  extends IActivityLogEntryBase
  implements IActivityLogEntry
{
  @Field(() => ICallout, {
    nullable: false,
    description: 'The Callout in which the Link was created.',
  })
  callout!: ICallout;

  @Field(() => IReference, {
    nullable: false,
    description: 'The Reference that was created.',
  })
  reference!: IReference;
}
