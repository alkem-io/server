import {
  MID_TEXT_LENGTH,
  VERY_LONG_TEXT_LENGTH,
} from '@common/constants/entity.field.length.constants';
import { UpdateTemplateBaseInput } from '@domain/template/template-base/dto/template.base.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';

@InputType()
export class UpdateAspectTemplateInput extends UpdateTemplateBaseInput {
  @Field({
    nullable: true,
    description: 'The type of Aspects created from this Template.',
  })
  @MaxLength(MID_TEXT_LENGTH)
  type!: string;

  @Field({
    nullable: true,
    description:
      'The default description to be pre-filled when users create Aspects based on this template.',
  })
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  defaultDescription!: string;
}
