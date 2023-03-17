import { UpdateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.update';
import { UpdateProfileInput } from '@domain/common/profile/dto/profile.dto.update';
import { InputType, Field } from '@nestjs/graphql';
import { MID_TEXT_LENGTH } from '@src/common/constants';
import { Type } from 'class-transformer';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';

@InputType()
export class UpdateAspectInput extends UpdateNameableInput {
  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(MID_TEXT_LENGTH)
  type?: string;

  @Field(() => UpdateProfileInput, {
    nullable: true,
    description: 'Update the Profile of the Card.',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UpdateProfileInput)
  profileData?: UpdateProfileInput;
}
