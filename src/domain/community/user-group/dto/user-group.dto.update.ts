import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity';
import { UpdateProfileInput } from '@domain/common/profile/dto';
import { Field, InputType } from '@nestjs/graphql';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { Type } from 'class-transformer';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';

@InputType()
export class UpdateUserGroupInput extends UpdateBaseAlkemioInput {
  @Field({ nullable: true })
  @MaxLength(SMALL_TEXT_LENGTH)
  name?: string;

  @Field(() => UpdateProfileInput, { nullable: true })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateProfileInput)
  profileData?: UpdateProfileInput;
}
