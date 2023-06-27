import { IPost } from '@domain/collaboration/post/post.interface';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IActivityLogEntryBase } from './activity.log.dto.entry.base.interface';
import { IActivityLogEntry } from './activity.log.entry.interface';

@ObjectType('ActivityLogEntryCalloutPostCreated', {
  implements: () => [IActivityLogEntry],
})
export abstract class IActivityLogEntryCalloutPostCreated
  extends IActivityLogEntryBase
  implements IActivityLogEntry
{
  @Field(() => ICallout, {
    nullable: false,
    description: 'The Callout in which the Post was created.',
  })
  callout!: ICallout;

  @Field(() => IPost, {
    nullable: false,
    description: 'The Post that was created.',
  })
  post!: IPost;
}
