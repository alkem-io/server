import { UUID_NAMEID_EMAIL } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateCalloutPublisherInput {
  @Field(() => String, {
    nullable: false,
    description:
      'The identifier for the Callout whose publisher is to be updated.',
  })
  calloutID!: string;

  @Field(() => UUID_NAMEID_EMAIL, {
    nullable: false,
    description: 'The identifier of the publisher of the Callout.',
  })
  publisherID!: string;

  @Field(() => Number, {
    nullable: true,
    description: 'The timestamp to set for the publishing of the Callout.',
  })
  publishDate!: number;
}
