import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { LONG_TEXT_LENGTH } from '@src/common/constants';
import { UpdateCanvasInput } from '@domain/common/canvas/dto/canvas.dto.update';
import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity/base.alkemio.dto.update';
import { Type } from 'class-transformer';

@InputType()
export class UpdateEcosystemModelInput extends UpdateBaseAlkemioInput {
  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  description?: string;

  @Field(() => UpdateCanvasInput, {
    nullable: true,
    description: 'Update the Canvas for this Ecosystem Model.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateCanvasInput)
  canvas?: UpdateCanvasInput;
}
