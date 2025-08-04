import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CalloutSettingsFraming')
export abstract class ICalloutSettingsFraming {
  @Field(() => Boolean, {
    nullable: false,
    description: 'Can comment to callout framing.',
  })
  commentsEnabled!: boolean;
}
