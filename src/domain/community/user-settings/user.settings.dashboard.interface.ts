import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('UserSettingsDashboard')
export abstract class IUserSettingsDashboard {
  @Field(() => Boolean, {
    nullable: false,
    description:
      'Whether the activity-feed view is shown on the home dashboard (true) or the non-activity Spaces view (false). Default true preserves the historical behaviour.',
  })
  activityView!: boolean;
}
