import { CreateNameableInput } from '@domain/common';
import { UUID } from '@domain/common/scalars';
import { InputType, Field } from '@nestjs/graphql';
import { CANVAS_VALUE_LENGTH } from '@src/common/constants';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class CreateCanvasOnContextInput extends CreateNameableInput {
  @Field(() => UUID, { nullable: false })
  contextID!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @MaxLength(CANVAS_VALUE_LENGTH)
  value?: string;
}
