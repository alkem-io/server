import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { TagsInput } from '../tagset/tagset.dto';

@InputType()
export class OrganisationInput {
  @Field({ nullable: true, description: 'The new name for this organisation' })
  @MaxLength(50)
  name?: string;

  @Field(() => TagsInput, {
    nullable: true,
    description: 'The set of tags to apply to this ecoverse',
  })
  tags?: TagsInput;
}
