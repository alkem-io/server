import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { IUserGroup } from '../user-group/user-group.interface';

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

  @Field({
    nullable: true,
    description: 'Email address is required for creating a new user',
  })
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

  @Field({ nullable: true })
  @MaxLength(30)
  aadPassword?: string;
}

export class AuthUserDTO {
  email: string;
  userGroups: IUserGroup[];

  constructor(email: string, userGroups: IUserGroup[]) {
    this.email = email;
    this.userGroups = userGroups;
  }
}
