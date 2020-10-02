import { MaxLength } from 'class-validator';
import { Field, InputType } from 'type-graphql';
import { TagsetInput, UpdateNestedTagsetInput } from './TagsetInput';

@InputType()
export class AgreementInput {
  @Field({ nullable: true })
  @MaxLength(30)
  name?: string;

  @Field({ nullable: true })
  @MaxLength(255)
  description?: string;

  @Field(() => TagsetInput, { nullable: true })
  tagset?: TagsetInput;
}

@InputType()
export class UpdateAgreementInput {
  @Field()
  id!: number;

  @Field({ nullable: true })
  @MaxLength(30)
  name?: string;

  @Field({ nullable: true })
  @MaxLength(255)
  description?: string;

  @Field(() => [UpdateNestedTagsetInput], { nullable: true })
  tagset?: UpdateNestedTagsetInput[];
}
