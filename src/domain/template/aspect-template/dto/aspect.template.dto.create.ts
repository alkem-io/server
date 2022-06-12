import {
  MID_TEXT_LENGTH,
  VERY_LONG_TEXT_LENGTH,
} from '@common/constants/entity.field.length.constants';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { CreateTemplateBaseInput } from '@domain/template/template-base/dto';
import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';

@InputType()
export class CreateAspectTemplateInput extends CreateTemplateBaseInput {
  @Field({
    nullable: false,
    description: 'The type of Aspects created from this Template.',
  })
  @MaxLength(MID_TEXT_LENGTH)
  type!: string;

  @Field(() => Markdown, {
    nullable: false,
    description:
      'The default description to be pre-filled when users create Aspects based on this template.',
  })
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  defaultDescription!: string;
}
