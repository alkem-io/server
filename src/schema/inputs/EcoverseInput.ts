import { InputType, Field } from 'type-graphql';
import {
  TagInput,
  ChallengeInput,
  OrganisationInput,
  UserGroupInput,
  ContextInput,
  UserInput,
  UpdateNestedChallengeInput,
  UpdateNestedOrganisationInput,
  UpdateNestedUserInput,
  UpdateNestedUserGroupInput,
  UpdateNestedContextInput,
  UpdateNestedTagInput,
} from '.';
import { MaxLength } from 'class-validator';

@InputType()
export class EcoverseInput {
  @Field({ nullable: true })
  @MaxLength(100)
  name?: string;

  @Field(() => [ChallengeInput], { nullable: true })
  challenges?: ChallengeInput[];

  @Field(() => [OrganisationInput], { nullable: true })
  partners?: OrganisationInput[];

  @Field(() => [UserInput], { nullable: true })
  members?: UserInput[];

  @Field(() => [UserGroupInput], { nullable: true })
  groups?: UserGroupInput[];

  @Field({ nullable: true })
  context?: ContextInput;

  @Field(() => [TagInput], { nullable: true })
  tags?: TagInput[];
}

@InputType()
export class UpdateEcoverseInput {
  @Field({ nullable: true })
  @MaxLength(100)
  name?: string;

  @Field(() => [UpdateNestedChallengeInput], { nullable: true })
  challenges?: UpdateNestedChallengeInput[];

  @Field(() => UpdateNestedOrganisationInput, { nullable: true })
  host?: UpdateNestedOrganisationInput;

  @Field(() => [UpdateNestedOrganisationInput], { nullable: true })
  partners?: UpdateNestedOrganisationInput[];

  @Field(() => [UpdateNestedUserInput], { nullable: true })
  members?: UpdateNestedUserInput[];

  @Field(() => [UpdateNestedUserGroupInput], { nullable: true })
  groups?: UpdateNestedUserGroupInput[];

  @Field({ nullable: true })
  context?: UpdateNestedContextInput;

  @Field(() => [UpdateNestedTagInput], { nullable: true })
  tags?: UpdateNestedTagInput[];
}
