import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { IMemo } from '@domain/common/memo/memo.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IActivityLogEntryBase } from './activity.log.dto.entry.base.interface';
import { IActivityLogEntry } from './activity.log.entry.interface';

@ObjectType('ActivityLogEntryCalloutMemoCreated', {
  implements: () => [IActivityLogEntry],
})
export abstract class IActivityLogEntryCalloutMemoCreated
  extends IActivityLogEntryBase
  implements IActivityLogEntry
{
  @Field(() => ICallout, {
    nullable: false,
    description: 'The Callout in which the Memo was created.',
  })
  callout!: ICallout;

  @Field(() => IMemo, {
    nullable: false,
    description: 'The Memo that was created.',
  })
  memo!: IMemo;
}
