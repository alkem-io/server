import { SMALL_TEXT_LENGTH } from '@common/constants';
import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
@ObjectType('CreateLocationData')
export class CreateLocationInput {
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
  stateOrProvince?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  addressLine1?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  addressLine2?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  postalCode?: string;
}
