import { Field, InputType } from '@nestjs/graphql';
import { UpdateProfileInput } from '@domain/community/profile/dto/profile.dto.update';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.update';

@InputType()
export class UpdateContributorInput extends UpdateNameableInput {
  @Field(() => UpdateProfileInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProfileInput)
  profileData?: UpdateProfileInput;
}
