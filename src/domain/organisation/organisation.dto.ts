import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';

@InputType()
export class OrganisationInput {
  @Field({ nullable: true, description: 'The new name for this organisation' })
  @MaxLength(50)
  name?: string;

  @Field(() => [String], {
    nullable: true,
    description: 'The set of tags to apply to this ecoverse',
  })
  tags?: string[];
}
