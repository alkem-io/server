import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, MaxLength } from 'class-validator';
import { ProfileInput } from '@domain/profile/profile.dto';

@InputType()
export class UserInput {
  @Field({ nullable: true })
  @MaxLength(255)
  accountUpn!: string;

  @Field({ nullable: true })
  @MaxLength(255)
  name?: string;

  @Field({ nullable: true })
  @MaxLength(255)
  firstName?: string;

  @Field({ nullable: true })
  @MaxLength(255)
  lastName?: string;

  @Field({
    nullable: true,
    description: 'Email address is required for creating a new user',
  })
  @MaxLength(255)
  @IsEmail()
  email!: string;

  @Field({ nullable: true })
  @MaxLength(255)
  phone?: string;

  @Field({ nullable: true })
  @MaxLength(255)
  city?: string;

  @Field({ nullable: true })
  @MaxLength(255)
  country?: string;

  @Field({ nullable: true })
  @MaxLength(255)
  gender?: string;

  @Field({ nullable: true })
  @MaxLength(255)
  aadPassword?: string;

  @Field(() => ProfileInput, { nullable: true })
  profileData?: ProfileInput;
}
