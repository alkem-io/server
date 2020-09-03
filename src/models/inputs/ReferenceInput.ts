import { InputType, Field } from 'type-graphql';
import { MaxLength } from 'class-validator';

@InputType()
export class ReferenceInput{

  @Field()
  @MaxLength(30)
  name! : string;

  @Field()
  @MaxLength(300)
  uri! : string;

  @Field()
  @MaxLength(300)
  description! : string;

}