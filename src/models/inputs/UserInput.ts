import { InputType, Field } from 'type-graphql';
import { MaxLength } from 'class-validator';
import { TagInput } from '.';

@InputType()
export class UserInput{

  @Field()
  @MaxLength(30)
  name! : string;

  @Field({ nullable: true })
  @MaxLength(120)
  account?: string;

  @Field({ nullable: true })
  @MaxLength(60)
  firstName?: string;

  @Field({ nullable: true })
  @MaxLength(60)
  lastName?: string;

  @Field()
  @MaxLength(120)
  email!: string;

  @Field( () => [TagInput], { nullable: true } )
  tags!: TagInput[];

}