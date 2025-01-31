import { Field, InputType } from '@nestjs/graphql';
import { IsArray, ArrayNotEmpty, IsUrl } from 'class-validator';

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
}
