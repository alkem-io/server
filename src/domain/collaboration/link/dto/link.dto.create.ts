import { MID_TEXT_LENGTH } from '@common/constants';
import { CreateProfileInput } from '@domain/common/profile/dto/profile.dto.create';
import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';

@InputType()
@ObjectType('CreateLinkData')
export class CreateLinkInput {
  @Field(() => CreateProfileInput, { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => CreateProfileInput)
  profile!: CreateProfileInput;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  uri?: string;
}
