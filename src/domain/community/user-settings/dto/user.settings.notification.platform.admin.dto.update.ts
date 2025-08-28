import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean } from 'class-validator';

@InputType()
export class UpdateUserSettingsNotificationPlatformAdminInput {
  @Field(() => Boolean, {
    nullable: true,
    description: '[Admin] Receive notification when a new user signs up',
  })
  @IsBoolean()
  userProfileCreated?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description:
      '[Admin] Receive a notification when a user profile is removed',
  })
  @IsBoolean()
  userProfileRemoved?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description:
      '[Admin] Receive a notification when a new L0 Space is created',
  })
  @IsBoolean()
  spaceCreated?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description:
      '[Admin] Receive a notification user is assigned or removed from a global role',
  })
  @IsBoolean()
  userGlobalRoleChanged?: boolean;
}
