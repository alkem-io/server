import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsOptional } from 'class-validator';

@InputType()
export class UpdateUserSettingsDashboardInput {
  @Field(() => Boolean, {
    nullable: true,
    description:
      'Whether the activity-feed view is shown on the home dashboard (true) or the non-activity Spaces view (false).',
  })
  @IsOptional()
  @IsBoolean()
  activityView?: boolean;
}
