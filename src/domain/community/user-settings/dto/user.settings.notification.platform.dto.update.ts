import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean } from 'class-validator';

@InputType()
export class UpdateUserSettingsNotificationPlatformInput {
  @Field(() => Boolean, {
    nullable: false,
    description:
      'Receive a notification when a new Discussion is created in the Forum',
  })
  @IsBoolean()
  forumDiscussionCreated!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Receive a notification when a new comment is added to a Discussion I created in the Forum',
  })
  @IsBoolean()
  forumDiscussionComment!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: '[Admin] Receive notification when a new user signs up',
  })
  @IsBoolean()
  newUserSignUp!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      '[Admin] Receive a notification when a user profile is removed',
  })
  @IsBoolean()
  userProfileRemoved!: boolean;
}
