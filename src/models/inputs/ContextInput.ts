import { InputType, Field } from 'type-graphql';
import { MaxLength, Length } from 'class-validator';
import { TagInput, ReferenceInput } from '.';

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

  @Field( type => [ReferenceInput], { nullable: true } )
  referenceLinks!: ReferenceInput[];

  @Field( type => [TagInput], { nullable: true } )
  tags!: TagInput[];

}