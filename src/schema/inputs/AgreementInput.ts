import { MaxLength } from 'class-validator';
import { Field, InputType } from 'type-graphql';
import { TagInput, UpdateNestedTagInput } from '.';

@InputType()
export class AgreementInput {
  @Field({ nullable: true })
  @MaxLength(30)
  name?: string;

  @Field({ nullable: true })
  @MaxLength(255)
  description?: string;

  @Field(() => [TagInput], { nullable: true })
  tags?: TagInput[];
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

  @Field(() => [UpdateNestedTagInput], { nullable: true })
  tags?: UpdateNestedTagInput[];
}
