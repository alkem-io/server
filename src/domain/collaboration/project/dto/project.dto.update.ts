import { UpdateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.update';
import { UpdateProfileInput } from '@domain/common/profile/dto';
import { InputType, Field } from '@nestjs/graphql';
import { Type } from 'class-transformer';

import { IsOptional, ValidateNested } from 'class-validator';

@InputType()
export class UpdateProjectInput extends UpdateNameableInput {
  @Field(() => UpdateProfileInput, {
    nullable: true,
    description: 'Update the Profile of the Canvas.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProfileInput)
  profileData?: UpdateProfileInput;
}
