import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsOptional, MaxLength } from 'class-validator';
import {
  LONG_TEXT_LENGTH,
  SMALL_TEXT_LENGTH,
  MID_TEXT_LENGTH,
} from '@src/common/constants';
import { CreateContributorInput } from '@domain/community/contributor/dto/contributor.dto.create';

@InputType()
export class CreateUserInput extends CreateContributorInput {
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
  gender?: string;
}
