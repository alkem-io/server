import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean } from 'class-validator';

@InputType()
export class NotificationSettingInput {
  @Field(() => Boolean, {
    nullable: true,
    description: 'Enable in-app notifications for this setting',
  })
  @IsBoolean()
  inApp?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Enable email notifications for this setting',
  })
  @IsBoolean()
  email?: boolean;
}
