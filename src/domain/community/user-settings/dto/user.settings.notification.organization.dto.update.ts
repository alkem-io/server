import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean } from 'class-validator';

@InputType()
export class UpdateUserSettingsNotificationOrganizationInput {
  @Field(() => Boolean, {
    nullable: true,
    description:
      'Receive notification when the organization you are admin of is messaged',
  })
  @IsBoolean()
  adminMessageReceived?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Receive a notification when the organization you are admin of is mentioned',
  })
  @IsBoolean()
  adminMentioned?: boolean;
}
