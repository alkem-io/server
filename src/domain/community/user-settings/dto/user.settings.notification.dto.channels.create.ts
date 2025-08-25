import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean } from 'class-validator';

@InputType()
export class CreateUserSettingsNotificationChannelsInput {
  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive notifications by email.',
  })
  @IsBoolean()
  email!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive notifications by inApp.',
  })
  @IsBoolean()
  inApp!: boolean;
}
