import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean } from 'class-validator';

@InputType()
export class CreateUserSettingsDashboardInput {
  @Field(() => Boolean, {
    nullable: false,
    description:
      'Whether the activity-feed view is shown on the home dashboard.',
  })
  @IsBoolean()
  activityView!: boolean;
}
