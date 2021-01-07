import { Directive, Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { ProfileInput } from '@domain/profile/profile.dto';

@InputType()
export class UserInput {
  @Field({ nullable: true })
  @MaxLength(50)
  accountUpn!: string;

  @Field({ nullable: true })
  @MaxLength(30)
  name?: string;

  @Field({ nullable: true })
  @MaxLength(60)
  firstName?: string;

  @Field({ nullable: true })
  @MaxLength(60)
  lastName?: string;

  @Directive('@constraint(format: "email", maxLength: 255)')
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

  @Field(() => ProfileInput, { nullable: true })
  profileData?: ProfileInput;
}
