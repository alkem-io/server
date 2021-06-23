import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsOptional, MaxLength } from 'class-validator';
import { CreateProfileInput } from '@domain/community/profile';
import {
  LONG_TEXT_LENGTH,
  SMALL_TEXT_LENGTH,
  MID_TEXT_LENGTH,
} from '@src/common/constants';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity';

@InputType()
export class CreateUserInput extends CreateNameableInput {
  @Field({
    nullable: false,
  })
  @IsEmail()
  @MaxLength(MID_TEXT_LENGTH)
  email!: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  accountUpn?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  firstName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  lastName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  phone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  city?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  country?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  gender?: string;

  @Field(() => CreateProfileInput, { nullable: true })
  profileData?: CreateProfileInput;
}
