import { Field, ObjectType } from '@nestjs/graphql';
import { IsBoolean } from 'class-validator';

@ObjectType('UserSettingsNotificationChannels')
export abstract class IUserSettingsNotificationChannels {
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
