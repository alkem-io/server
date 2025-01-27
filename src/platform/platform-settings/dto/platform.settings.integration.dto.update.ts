import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean } from 'class-validator';

@InputType()
export class UpdatePlatformSettingsIntegrationInput {
  @Field(() => [String], {
    nullable: false,
    description:
      'Update the list of allowed URLs for iFrames within Markdown content.',
  })
  @IsBoolean()
  iframeAllowedUrls!: string[];
}
