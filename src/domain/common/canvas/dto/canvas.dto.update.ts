import { UpdateNameableInputOld } from '@domain/common/entity/nameable-entity/dto/nameable.dto.update.old';
import { InputType, Field } from '@nestjs/graphql';
import { CANVAS_VALUE_LENGTH } from '@src/common/constants';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class UpdateCanvasInput extends UpdateNameableInputOld {
  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(CANVAS_VALUE_LENGTH)
  value?: string;
}
