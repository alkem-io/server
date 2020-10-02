import { MaxLength } from 'class-validator';
import { Field, InputType } from 'type-graphql';
import {
  ContextInput,
  TagsetInput,
  UpdateNestedTagsetInput,
  UpdateNestedContextInput,
  UserGroupInput,
  UpdateNestedUserGroupInput,
} from '.';

@InputType()
export class ChallengeInput {
  @Field({ nullable: true })
  @MaxLength(100)
  name?: string;

  @Field({ nullable: true })
  @MaxLength(255)
  description?: string;

  @Field({ nullable: true })
  @MaxLength(255)
  lifecyclePhase?: string;

  @Field(() => TagsetInput, { nullable: true })
  tags?: TagsetInput;

  @Field(() => ContextInput, { nullable: true })
  context?: ContextInput;

  @Field(() => [UserGroupInput], { nullable: true })
  groups?: UserGroupInput[];
}

@InputType()
export class BaseUpdateChallengeInput {
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
  tags?: UpdateNestedTagsetInput;

  @Field(() => UpdateNestedContextInput, { nullable: true })
  context?: UpdateNestedContextInput;

  @Field(() => [UpdateNestedUserGroupInput], { nullable: true })
  groups?: UpdateNestedUserGroupInput[];
}

@InputType()
export class UpdateRootChallengeInput extends BaseUpdateChallengeInput {
  @Field()
  id!: number;
}

@InputType()
export class UpdateNestedChallengeInput extends BaseUpdateChallengeInput {
  @Field({ nullable: true })
  id?: number;
}
