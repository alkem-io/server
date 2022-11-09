import {
  LONG_TEXT_LENGTH,
  SMALL_TEXT_LENGTH,
} from '@common/constants/entity.field.length.constants';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { UpdateTemplateInfoInput } from '@domain/template/template-info/dto/template.base.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { MaxLength, ValidateNested } from 'class-validator';

@InputType()
export class UpdateCalloutCardTemplateInput {
  @Field({
    nullable: true,
    description: 'The type of Aspects created from this Template.',
  })
  @MaxLength(SMALL_TEXT_LENGTH)
  type!: string;

  @Field(() => Markdown, {
    nullable: true,
    description:
      'The default description to be pre-filled when users create Aspects based on this template.',
  })
  @MaxLength(LONG_TEXT_LENGTH)
  defaultDescription!: string;

  @Field({
    nullable: true,
    description: 'The meta information for this Template.',
  })
  @ValidateNested()
  @Type(() => UpdateTemplateInfoInput)
  info!: UpdateTemplateInfoInput;
}
