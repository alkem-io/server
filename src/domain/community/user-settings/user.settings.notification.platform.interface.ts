import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('UserSettingsNotificationPlatform')
export abstract class IUserSettingsNotificationPlatform {
  @Field(() => Boolean, {
    nullable: false,
    description:
      'Receive a notification when a new Discussion is created in the Forum',
  })
  forumDiscussionCreated!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Receive a notification when a new comment is added to a Discussion I created in the Forum',
  })
  forumDiscussionComment!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive notification when a new user signs up',
  })
  newUserSignUp!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when a user profile is removed',
  })
  userProfileRemoved!: boolean;
}
