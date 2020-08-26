import { InputType, Field } from 'type-graphql';
import { MaxLength, Length } from 'class-validator';
import { TagInput } from '.';

@InputType()
export class ContextInput{

  @Field()
  @MaxLength(30)
  name! : string;

  @Field({ nullable: true })
  @MaxLength(255)
  description?: string;

  @Field({ nullable: true })
  @MaxLength(255)
  vision?: string;

  @Field({ nullable: true })
  @MaxLength(255)
  principles?: string;

  @Field({ nullable: true })
  @Length(0, 1024)
  referenceLinks?: string;

  @Field( type => [TagInput], { nullable: true } )
  tags!: TagInput[];

}