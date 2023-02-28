import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, ValidateNested } from 'class-validator';
import { UpdateContextInput } from '@domain/context/context/dto/context.dto.update';
import { UpdateNameableInputOld } from '@domain/common/entity/nameable-entity/dto/nameable.dto.update.old';
import { Type } from 'class-transformer';
import { UpdateProfileInput } from '@domain/common/profile/dto/profile.dto.update';

@InputType()
export class UpdateBaseChallengeInput extends UpdateNameableInputOld {
  @Field(() => UpdateContextInput, {
    nullable: true,
    description: 'Update the contained Context entity.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateContextInput)
  context?: UpdateContextInput;

  @Field(() => UpdateProfileInput, {
    nullable: true,
    description: 'Update the contained Profile entity.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProfileInput)
  profileData?: UpdateProfileInput;
}
