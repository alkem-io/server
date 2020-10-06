import { InputType, Field } from 'type-graphql';
import { TagsetInput, UserInput, UpdateNestedUserInput, UpdateNestedTagsetInput, ProfileInput } from '.';
import { MaxLength } from 'class-validator';

@InputType()
export class UserGroupInput {
  // TODO: [ATS] must be required field when group is created
  @Field({ nullable: true })
  @MaxLength(100)
  name?: string;

  @Field(() => UserInput, { nullable: true })
  focalPoint?: UserInput;

  @Field(() => [UserInput], { nullable: true })
  members?: UserInput[];

  @Field(() => TagsetInput, { nullable: true })
  tagset?: TagsetInput;

  @Field(() => ProfileInput, { nullable: true })
  profile?: ProfileInput;
}

@InputType()
export class BaseUpdateUserGroupInput {
  @Field({ nullable: true })
  @MaxLength(30)
  name?: string;

  @Field(() => UpdateNestedUserInput, { nullable: true })
  focalPoint?: UpdateNestedUserInput;

  @Field(() => [UpdateNestedUserInput], { nullable: true })
  members?: UpdateNestedUserInput[];

  @Field(() => UpdateNestedTagsetInput, { nullable: true })
  tagset?: UpdateNestedTagsetInput;

  @Field(() => ProfileInput, { nullable: true })
  profile?: ProfileInput;
}

@InputType()
export class UpdateRootUserGroupInput extends BaseUpdateUserGroupInput {
  @Field()
  id!: number;
}

@InputType()
export class UpdateNestedUserGroupInput extends BaseUpdateUserGroupInput {
  @Field({ nullable: true })
  id?: number;
}
