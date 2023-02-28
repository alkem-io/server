import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, ValidateNested } from 'class-validator';
import { CreateContextInput } from '@domain/context/context/dto/context.dto.create';
import { CreateNameableInputOld } from '@domain/common/entity/nameable-entity/dto/nameable.dto.create.old';
import { Type } from 'class-transformer';
import { CreateProfileInput } from '@domain/common/profile/dto/profile.dto.create';

@InputType()
export class CreateBaseChallengeInput extends CreateNameableInputOld {
  @Field(() => CreateContextInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateContextInput)
  context?: CreateContextInput;

  @Field(() => CreateProfileInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateProfileInput)
  profileData?: CreateProfileInput;
}
