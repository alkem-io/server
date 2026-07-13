import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsOptional } from 'class-validator';

@InputType()
export class CreateUserSettingsNotificationSoundInput {
  @Field(() => Boolean, {
    nullable: true,
    defaultValue: true,
    description: 'Play a sound when a chat message is received. Default true.',
  })
  @IsOptional()
  @IsBoolean()
  chatMessage?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    defaultValue: true,
    description:
      'Play a sound when a non-chat in-app notification is received. Default true.',
  })
  @IsOptional()
  @IsBoolean()
  inAppNotification?: boolean;
}
