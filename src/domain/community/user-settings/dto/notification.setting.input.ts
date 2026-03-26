import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsOptional } from 'class-validator';

@InputType()
export class NotificationSettingInput {
  @Field(() => Boolean, {
    nullable: true,
    description: 'Enable in-app notifications for this setting',
  })
  @IsOptional()
  @IsBoolean()
  inApp?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Enable email notifications for this setting',
  })
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Enable push notifications for this setting',
  })
  @IsOptional()
  @IsBoolean()
  push?: boolean;
}
