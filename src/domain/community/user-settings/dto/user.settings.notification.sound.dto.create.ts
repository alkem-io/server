import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, ValidateIf } from 'class-validator';

// See the update input: an explicit null is invalid here too, since the matching
// output fields are Boolean!. Omitting a field falls back to the `true` default.
@InputType()
export class CreateUserSettingsNotificationSoundInput {
  @Field(() => Boolean, {
    nullable: true,
    defaultValue: true,
    description: 'Play a sound when a chat message is received. Default true.',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  chatMessage?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    defaultValue: true,
    description:
      'Play a sound when a non-chat in-app notification is received. Default true.',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  inAppNotification?: boolean;
}
