import { Field, InputType } from '@nestjs/graphql';
import { UpdateProfileInput } from '@domain/community/profile/dto/profile.dto.update';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateNameable2Input } from '@domain/common/entity/nameable-entity/nameable.dto.update2';

@InputType()
export class UpdateContributorInput extends UpdateNameable2Input {
  @Field(() => UpdateProfileInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProfileInput)
  profileData?: UpdateProfileInput;
}
