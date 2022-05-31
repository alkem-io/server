import { UpdateNameableInput } from '@domain/common/entity/nameable-entity';
import { InputType, Field } from '@nestjs/graphql';
import { LONG_TEXT_LENGTH } from '@src/common/constants';

import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class UpdateProjectInput extends UpdateNameableInput {
  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  description?: string;
}
