import { InputType, Field } from 'type-graphql';
import { MaxLength } from 'class-validator';
import { TagInput, AgreementInput, UpdateNestedTagInput, UpdateAgreementInput } from '.';

@InputType()
export class ProjectInput {

  @Field({ nullable: true })
  @MaxLength(30)
  name?: string;

  @Field({ nullable: true })
  @MaxLength(255)
  description?: string;

  @Field({ nullable: true })
  @MaxLength(255)
  lifecyclePhase?: string;

  @Field( () => [TagInput], { nullable: true } )
  tags!: TagInput[];

  @Field( () => [AgreementInput], { nullable: true })
  agreements?: AgreementInput[];
}

@InputType()
export class UpdateProjectInput {

  @Field()
  id! : number;

  @Field({ nullable: true })
  @MaxLength(30)
  name?: string;

  @Field({ nullable: true })
  @MaxLength(255)
  description?: string;

  @Field({ nullable: true })
  @MaxLength(255)
  lifecyclePhase?: string;

  @Field( () => [UpdateNestedTagInput], { nullable: true } )
  tags!: UpdateNestedTagInput[];

  @Field( () => [UpdateAgreementInput], { nullable: true })
  agreements?: UpdateAgreementInput[];
}