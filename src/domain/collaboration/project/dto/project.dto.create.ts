import { CreateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.create';
import { CreateProfileInput } from '@domain/common/profile/dto/profile.dto.create';
import { UUID_NAMEID } from '@domain/common/scalars';
import { InputType, Field } from '@nestjs/graphql';
import { Type } from 'class-transformer';

import { ValidateNested } from 'class-validator';

@InputType()
export class CreateProjectInput extends CreateNameableInput {
  @Field(() => UUID_NAMEID, { nullable: false })
  opportunityID!: string;

  @Field(() => CreateProfileInput, { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => CreateProfileInput)
  profileData!: CreateProfileInput;
}
