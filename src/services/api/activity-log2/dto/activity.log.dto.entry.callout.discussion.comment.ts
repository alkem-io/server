import { ICallout } from '@domain/collaboration/callout';
import { Field, ObjectType } from '@nestjs/graphql';
import { IActivityLogEntryBase } from './activity.log.dto.entry.base.interface';
import { IActivityLogEntry } from './activity.log.entry.interface';

@ObjectType('ActivityLogEntryCalloutDiscussionComment', {
  implements: () => [IActivityLogEntry],
})
export abstract class IActivityLogEntryCalloutDiscussionComment
  extends IActivityLogEntryBase
  implements IActivityLogEntry
{
  @Field(() => ICallout, {
    nullable: false,
    description: 'The Callout in which the comment was added.',
  })
  callout!: ICallout;
}
