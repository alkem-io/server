import { InputType, Field } from 'type-graphql';
import { MaxLength, Length } from 'class-validator';
import { TagInput, UserInput } from '.';

@InputType()
export class OrganisationInput{

  @Field()
  @MaxLength(30)
  name! : string;

  @Field( type => [UserInput], { nullable: true })
  members?: UserInput[];

  @Field( type => [TagInput], { nullable: true } )
  tags!: TagInput[];

}