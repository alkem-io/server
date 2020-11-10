import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';

@InputType()
export class OrganisationInput {
  @Field({ nullable: true, description: 'The name for this organisation' })
  @MaxLength(50)
  name?: string;
}
