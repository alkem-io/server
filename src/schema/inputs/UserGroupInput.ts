import { InputType, Field } from 'type-graphql';
import { TagInput, UserInput, UpdateNestedUserInput, UpdateNestedTagInput } from '.';
import { MaxLength } from 'class-validator';

@InputType()
export class UserGroupInput {

  @Field({ nullable: true })
  @MaxLength(100)
  name?: string;

  @Field(() => UserInput, { nullable: true })
  focalPoint?: UserInput;

  @Field( () => [UserInput], { nullable: true })
  members?: UserInput[];

  @Field( () => [TagInput], { nullable: true } )
  tags?: TagInput[];

}

@InputType()
export class BaseUpdateUserGroupInput {

  @Field({ nullable: true })
  @MaxLength(30)
  name?: string;

  @Field(() => UpdateNestedUserInput, { nullable: true })
  focalPoint?: UpdateNestedUserInput;

  @Field( () => [UpdateNestedUserInput], { nullable: true })
  members?: UpdateNestedUserInput[];

  @Field( () => [UpdateNestedTagInput], { nullable: true } )
  tags?: UpdateNestedTagInput[];

}

@InputType()
export class UpdateRootUserGroupInput extends BaseUpdateUserGroupInput {

  @Field()
  id! : number;

}

@InputType()
export class UpdateNestedUserGroupInput extends BaseUpdateUserGroupInput {

  @Field( { nullable: true } )
  id? : number;

}