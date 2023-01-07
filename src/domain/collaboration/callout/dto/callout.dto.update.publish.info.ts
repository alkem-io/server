import { UUID_LENGTH } from '@common/constants';
import { UUID_NAMEID_EMAIL } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';

@InputType()
export class UpdateCalloutPublishInfoInput {
  @Field(() => String, {
    nullable: false,
    description:
      'The identifier for the Callout whose publisher is to be updated.',
  })
  @MaxLength(UUID_LENGTH)
  calloutID!: string;

  @Field(() => UUID_NAMEID_EMAIL, {
    nullable: true,
    description: 'The identifier of the publisher of the Callout.',
  })
  @MaxLength(UUID_LENGTH)
  publisherID!: string;

  @Field(() => Number, {
    nullable: true,
    description: 'The timestamp to set for the publishing of the Callout.',
  })
  publishDate!: number;
}
