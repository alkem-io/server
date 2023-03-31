import {
  LONG_TEXT_LENGTH,
  SMALL_TEXT_LENGTH,
} from '@common/constants/entity.field.length.constants';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { UpdateTemplateBaseInput } from '@domain/template/template-base/dto/template.base.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';

@InputType()
export class UpdatePostTemplateInput extends UpdateTemplateBaseInput {
  @Field({
    nullable: true,
    description: 'The type of Posts created from this Template.',
  })
  @MaxLength(SMALL_TEXT_LENGTH)
  type!: string;

  @Field(() => Markdown, {
    nullable: true,
    description:
      'The default description to be pre-filled when users create Posts based on this template.',
  })
  @MaxLength(LONG_TEXT_LENGTH)
  defaultDescription!: string;
}
