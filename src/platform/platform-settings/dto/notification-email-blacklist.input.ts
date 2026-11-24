import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';

/**
 * The one format rule for a notification blacklist entry, shared by the add
 * mutation (checked in PlatformSettingsService) and the bulk settings update
 * (checked by its DTO).
 */
export const NOTIFICATION_EMAIL_FORMAT = {
  blacklisted_chars: '\r\n',
};

// Shared by add and remove. Format is checked on add only, so removal can
// still match any entry already stored.
@InputType()
export class NotificationEmailAddressInput {
  @Field(() => String, {
    description:
      'Full email address to add/remove; lowercase enforced by server',
  })
  @Transform(({ value }) => value.toLowerCase())
  email!: string;
}
