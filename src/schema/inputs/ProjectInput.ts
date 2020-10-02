import { InputType, Field } from 'type-graphql';
import { MaxLength } from 'class-validator';
import { TagsetInput, AgreementInput, UpdateNestedTagsetInput, UpdateAgreementInput } from '.';

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

  @Field(() => TagsetInput, { nullable: true })
  tagset!: TagsetInput;

  @Field(() => [AgreementInput], { nullable: true })
  agreements?: AgreementInput[];
}

@InputType()
export class UpdateProjectInput {
  @Field()
  id!: number;

  @Field({ nullable: true })
  @MaxLength(30)
  name?: string;

  @Field({ nullable: true })
  @MaxLength(255)
  description?: string;

  @Field({ nullable: true })
  @MaxLength(255)
  lifecyclePhase?: string;

  @Field(() => UpdateNestedTagsetInput, { nullable: true })
  tagset!: UpdateNestedTagsetInput;

  @Field(() => [UpdateAgreementInput], { nullable: true })
  agreements?: UpdateAgreementInput[];
}
