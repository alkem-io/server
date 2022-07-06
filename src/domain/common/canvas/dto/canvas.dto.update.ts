import { UpdateNameableInput } from '@domain/common/entity/nameable-entity/nameable.dto.update';
import { InputType, Field } from '@nestjs/graphql';
import { CANVAS_VALUE_LENGTH } from '@src/common/constants';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class UpdateCanvasInput extends UpdateNameableInput {
  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(CANVAS_VALUE_LENGTH)
  value?: string;

  @Field({ nullable: true })
  isTemplate?: boolean;
}
