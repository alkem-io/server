import { InputType, Field } from 'type-graphql';
import { MaxLength } from 'class-validator';

@InputType()
export class TagInput{

  @Field()
  @MaxLength(30)
  name! : string;

}