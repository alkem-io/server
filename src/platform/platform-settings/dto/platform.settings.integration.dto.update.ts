import { Field, InputType } from '@nestjs/graphql';
import { ArrayNotEmpty, IsArray, IsEmail, IsUrl } from 'class-validator';
import { NOTIFICATION_EMAIL_FORMAT } from './notification-email-blacklist.input';

@InputType()
export class UpdatePlatformSettingsIntegrationInput {
  @Field(() => [String], {
    nullable: false,
    description:
      'Update the list of allowed URLs for iFrames within Markdown content.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUrl({}, { each: true })
  iframeAllowedUrls!: string[];

  @Field(() => [String], {
    nullable: true,
    description:
      'Update the list of email addresses blocked from receiving notifications.',
  })
  @IsArray()
  @IsEmail(NOTIFICATION_EMAIL_FORMAT, { each: true })
  notificationEmailBlacklist?: string[];
}
