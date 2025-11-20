import { Field, InputType } from '@nestjs/graphql';
import { IsArray, ArrayNotEmpty, IsUrl, IsEmail } from 'class-validator';

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
  @IsEmail({}, { each: true })
  notificationEmailBlacklist?: string[];
}
