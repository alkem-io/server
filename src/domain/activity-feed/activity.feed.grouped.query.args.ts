import { Field, InputType } from '@nestjs/graphql';
import { ActivityFeedQueryArgs } from './activity.feed.query.args';

@InputType()
export class ActivityFeedGroupedQueryArgs extends ActivityFeedQueryArgs {
  @Field(() => Number, {
    nullable: true,
    description: 'Number of activities to return.',
  })
  limit?: number;
}
