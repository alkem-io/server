import { Field, InputType, ObjectType } from '@nestjs/graphql';

@InputType()
@ObjectType('CreateCalloutSettingsFramingData')
export class CreateCalloutSettingsFramingInput {
  @Field(() => Boolean, {
    nullable: true,
    description: 'Can comment to callout framing.',
  })
  commentsEnabled?: boolean;
}
