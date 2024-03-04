import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IActivityLogEntryBase } from './activity.log.dto.entry.base.interface';
import { IActivityLogEntry } from './activity.log.entry.interface';
import { ILink } from '@domain/collaboration/link/link.interface';

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

  @Field(() => ILink, {
    nullable: false,
    description: 'The Link that was created.',
  })
  link!: ILink;
}
