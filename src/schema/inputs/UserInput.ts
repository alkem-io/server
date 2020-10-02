import { InputType, Field } from 'type-graphql';
import { MaxLength } from 'class-validator';
import { TagInput, UpdateNestedTagInput } from '.';

@InputType()
export class UserInput {
  @Field({ nullable: true })
  @MaxLength(30)
  name?: string;

  @Field({ nullable: true })
  @MaxLength(120)
  account?: string;

  @Field({ nullable: true })
  @MaxLength(60)
  firstName?: string;

  @Field({ nullable: true })
  @MaxLength(60)
  lastName?: string;

  @Field({ nullable: true })
  @MaxLength(120)
  email?: string;

}

@InputType()
export class BaseUpdateUserInput {
  @Field({ nullable: true })
  @MaxLength(30)
  name?: string;

  @Field({ nullable: true })
  @MaxLength(120)
  account?: string;

  @Field({ nullable: true })
  @MaxLength(60)
  firstName?: string;

  @Field({ nullable: true })
  @MaxLength(60)
  lastName?: string;

  @Field({ nullable: true })
  @MaxLength(120)
  email?: string;

}

@InputType()
export class UpdateRootUserInput extends BaseUpdateUserInput {
  @Field()
  id!: number;
}

@InputType()
export class UpdateNestedUserInput extends BaseUpdateUserInput {
  @Field({ nullable: true })
  id?: number;
}
