import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsOptional, MaxLength } from 'class-validator';
import { ProfileInput } from '@domain/profile/profile.dto';

@InputType()
export class UserInput {
  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(50)
  accountUpn!: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(30)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(60)
  firstName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(60)
  lastName?: string;

  @Field({
    nullable: true,
    description: 'Email address is required for mutations!',
  })
  @IsEmail()
  email!: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(120)
  phone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(120)
  city?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(120)
  country?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(20)
  gender?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(30)
  aadPassword?: string;

  @Field(() => ProfileInput, { nullable: true })
  @IsOptional()
  profileData?: ProfileInput;
}
