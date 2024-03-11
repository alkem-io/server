import { Field, InputType } from '@nestjs/graphql';
import { ActivityEventType } from '@common/enums/activity.event.type';
import { UUID } from '@domain/common/scalars';
import { ActivityFeedRoles } from './activity.feed.roles.enum';

@InputType()
export class ActivityFeedQueryArgs {
  @Field(() => [ActivityEventType], {
    nullable: true,
    description: 'What events to include; Includes all by default.',
  })
  types?: Array<ActivityEventType>;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Returns only events that the current user triggered; Includes all by default.',
  })
  myActivity?: boolean;

  @Field(() => [UUID], {
    nullable: true,
    description:
      'Activity from which Spaces to include; Includes all by default.',
  })
  spaceIds?: Array<string>;

  @Field(() => [ActivityFeedRoles], {
    nullable: true,
    description:
      'Activity from which Spaces to include; Includes all by default.',
  })
  roles?: Array<ActivityFeedRoles>;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Group activity events per entity and activity event type and return the latest.',
  })
  onlyUnique?: boolean;

  @Field(() => [ActivityEventType], {
    nullable: true,
    description: 'What events to exclude.',
  })
  excludeTypes?: Array<ActivityEventType>;
}
