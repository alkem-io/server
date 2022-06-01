import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity';
import { UpdateProfileInput } from '../../profile/dto';
import { Type } from 'class-transformer';

@InputType()
export class UpdateUserGroupInput extends UpdateBaseAlkemioInput {
  @Field({ nullable: true })
  @MaxLength(SMALL_TEXT_LENGTH)
  name?: string;

  @Field(() => UpdateProfileInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProfileInput)
  profileData?: UpdateProfileInput;
}
