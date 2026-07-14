import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, ValidateIf } from 'class-validator';

// Fields are omittable (a partial update leaves the sibling flag untouched), but
// an explicit null is invalid: the matching output fields are Boolean!, so a
// persisted null would fail the non-null check on every later read. `IsOptional`
// would skip validation for null as well as undefined, so `ValidateIf` is used to
// skip only when the field is absent.
@InputType()
export class UpdateUserSettingsNotificationSoundInput {
  @Field(() => Boolean, {
    nullable: true,
    description: 'Play a sound when a chat message is received. Default true.',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  chatMessage?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Play a sound when a non-chat in-app notification is received. Default true.',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  inAppNotification?: boolean;
}
