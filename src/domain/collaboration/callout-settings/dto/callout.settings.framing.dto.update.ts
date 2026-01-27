import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateCalloutSettingsFramingInput {
  @Field(() => Boolean, {
    nullable: true,
    description: 'Can comment to callout framing.',
  })
  commentsEnabled?: boolean;
}
