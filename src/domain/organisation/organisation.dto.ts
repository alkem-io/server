import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { TagsInput } from '../tagset/tagset.dto';

@InputType()
export class OrganisationInput {
  @Field({ nullable: true })
  @MaxLength(50)
  name?: string;

  @Field(() => TagsInput, { nullable: true })
  tags?: TagsInput;
}
