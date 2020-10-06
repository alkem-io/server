import { Field, InputType } from 'type-graphql';
import { TagsetInput, UserInput, UpdateNestedUserInput, UpdateNestedTagsetInput } from '.';
import { MaxLength } from 'class-validator';

@InputType()
export class OrganisationInput {
  @Field({ nullable: true })
  @MaxLength(30)
  name?: string;

  @Field(() => [UserInput], { nullable: true })
  members?: UserInput[];

  @Field(() => TagsetInput, { nullable: true })
  tagset?: TagsetInput;
}

@InputType()
export class BaseUpdateOrganisationInput {
  @Field({ nullable: true })
  @MaxLength(30)
  name?: string;

  @Field(() => [UpdateNestedUserInput], { nullable: true })
  members?: UpdateNestedUserInput[];

  @Field(() => UpdateNestedTagsetInput, { nullable: true })
  tagset?: UpdateNestedTagsetInput;
}

@InputType()
export class UpdateRootOrganisationInput extends BaseUpdateOrganisationInput {
  @Field()
  id!: number;
}

@InputType()
export class UpdateNestedOrganisationInput extends BaseUpdateOrganisationInput {
  @Field({ nullable: true })
  id?: number;
}
