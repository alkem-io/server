import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProfileInput } from '@domain/common/profile/dto/profile.dto.create';
import { MID_TEXT_LENGTH } from '@common/constants';
@InputType()
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
