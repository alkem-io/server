import { Field, InputType } from '@nestjs/graphql';
import { UpdateProfileInput } from '@domain/community/profile/dto/profile.dto.update';
import { UpdateNameableInput } from '@domain/common/entity/nameable-entity';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class UpdateContributorInput extends UpdateNameableInput {
  @Field(() => UpdateProfileInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProfileInput)
  profileData?: UpdateProfileInput;
}
