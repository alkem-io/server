import { CreateCanvasInput } from '@domain/common/canvas/dto/canvas.dto.create';
import { UUID } from '@domain/common/scalars';
import { InputType, Field } from '@nestjs/graphql';
import { CANVAS_VALUE_LENGTH, UUID_LENGTH } from '@src/common/constants';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class CreateCanvasOnCalloutInput extends CreateCanvasInput {
  @Field(() => UUID, { nullable: false })
  @MaxLength(UUID_LENGTH)
  calloutID!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @MaxLength(CANVAS_VALUE_LENGTH)
  value?: string;
}
