import { ArgsType, Field } from '@nestjs/graphql';
import { ActivityEventType } from '@common/enums/activity.event.type';
import { UUID } from '@domain/common/scalars';
import { ActivityFeedRoles } from './activity.feed.roles.enum';

@ArgsType()
export class ActivityFeedQueryArgs {
  @Field(() => [ActivityEventType], {
    nullable: true,
    description: 'What events to include; Includes all by default.',
  })
  types?: Array<ActivityEventType>;

  @Field(() => Boolean, {
    nullable: true,
    defaultValue: true,
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
}
