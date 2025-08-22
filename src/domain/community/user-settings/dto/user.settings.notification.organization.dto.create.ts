import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean } from 'class-validator';

@InputType()
export class CreateUserSettingsNotificationOrganizationInput {
  @Field(() => Boolean, {
    nullable: false,
    description:
      'Receive notification when the organization you are admin of is messaged',
  })
  @IsBoolean()
  adminMessageReceived!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Receive a notification when the organization you are admin of is mentioned',
  })
  @IsBoolean()
  adminMentioned!: boolean;
}
