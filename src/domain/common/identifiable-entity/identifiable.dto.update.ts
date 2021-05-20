import { SMALL_TEXT_LENGTH } from '@common/constants';
import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { UpdateBaseCherrytwistInput } from '@domain/common/base-entity';

@InputType()
export class UpdateIdentifiableInput extends UpdateBaseCherrytwistInput {
  @Field({ nullable: true, description: 'The name for this entity.' })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  name?: string;
}
