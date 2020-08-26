import { InputType, Field } from 'type-graphql';
import { MaxLength, Length } from 'class-validator';
import { TagInput } from '.';
import { Agreement } from '../entities';

@InputType()
export class AgreementInput  {

  @Field()
  @MaxLength(30)
  name! : string;

  @Field({ nullable: true })
  @Length(0, 255)
  description!: string;

  @Field( type => [TagInput], { nullable: true } )
  tags!: TagInput[];

}