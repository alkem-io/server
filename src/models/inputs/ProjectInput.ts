import { InputType, Field } from 'type-graphql';
import { MaxLength } from 'class-validator';
import { TagInput, AgreementInput } from '.';

@InputType()
export class ProjectInput{

  @Field()
  @MaxLength(30)
  name! : string;

  @Field({ nullable: true })
  @MaxLength(255)
  description?: string;

  @Field({ nullable: true })
  @MaxLength(255)
  lifecyclePhase?: string;

  @Field( type => [TagInput], { nullable: true } )
  tags!: TagInput[];

  @Field( type => [AgreementInput], { nullable: true })
  agreements?: AgreementInput[];
}