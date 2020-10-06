import { InputType, Field } from 'type-graphql';
import { MaxLength } from 'class-validator';
import { ProfileInput } from './';

@InputType()
export class UserInput {
  @Field({ nullable: true })
  @MaxLength(30)
  name?: string;

  @Field({ nullable: true })
  @MaxLength(60)
  firstName?: string;

  @Field({ nullable: true })
  @MaxLength(60)
  lastName?: string;

  @Field({ nullable: true , description: 'Email address is required for creating a new user'})
  @MaxLength(120)
  email!: string;

  @Field({ nullable: true })
  @MaxLength(120)
  phone?: string;

  @Field({ nullable: true })
  @MaxLength(120)
  city?: string;

  @Field({ nullable: true })
  @MaxLength(120)
  country?: string;

  @Field({ nullable: true })
  @MaxLength(20)
  gender?: string;

  @Field(() => ProfileInput, { nullable: true })
  profile?: ProfileInput;
}

@InputType()
export class BaseUpdateUserInput {
  @Field({ nullable: true })
  @MaxLength(30)
  name?: string;

  @Field({ nullable: true })
  @MaxLength(60)
  firstName?: string;

  @Field({ nullable: true })
  @MaxLength(60)
  lastName?: string;

  @Field({ nullable: true, description: 'Email address is required for creating a new user' })
  @MaxLength(120)
  email!: string;

  @Field({ nullable: true })
  @MaxLength(120)
  phone?: string;

  @Field({ nullable: true })
  @MaxLength(120)
  city?: string;

  @Field({ nullable: true })
  @MaxLength(120)
  country?: string;

  @Field({ nullable: true })
  @MaxLength(20)
  gender?: string;

  @Field(() => ProfileInput, { nullable: true })
  profile?: ProfileInput;
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
