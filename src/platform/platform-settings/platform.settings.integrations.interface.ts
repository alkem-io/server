import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('PlatformIntegrationSettings')
export abstract class IPlatformSettingsIntegration {
  @Field(() => [String], {
    nullable: false,
    description:
      'The list of allowed URLs for iFrames within Markdown content.',
  })
  iframeAllowedUrls!: string[];
}
