import { VERY_LONG_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity/dto/base.alkemio.dto.update';
import { UpdateProfileInput } from '@domain/common/profile/dto/profile.dto.update';
import { UUID } from '@domain/common/scalars';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { CreateClassificationTemplateContentInput } from './classification.template.content.dto.create';

@InputType()
export class UpdateTemplateInput extends UpdateBaseAlkemioInput {
  @Field(() => UpdateProfileInput, {
    nullable: true,
    description: 'The Profile of the Template.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProfileInput)
  profile?: UpdateProfileInput;

  @Field(() => Markdown, {
    nullable: true,
    description:
      'The default description to be pre-filled when users create Posts based on this template.',
  })
  @IsOptional()
  @MaxLength(VERY_LONG_TEXT_LENGTH)
  postDefaultDescription!: string;

  /** Server-internal canonical snapshot used by trusted template serialization. */
  whiteboardContent?: string;

  @Field(() => UUID, {
    nullable: true,
    description:
      'Replace this Whiteboard Template from an existing Whiteboard through a server-side authorized copy.',
  })
  @IsOptional()
  sourceWhiteboardID?: string;

  @Field(() => CreateClassificationTemplateContentInput, {
    nullable: true,
    description: 'The cardinality and value set for a Classification Template.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateClassificationTemplateContentInput)
  classificationData?: CreateClassificationTemplateContentInput;
}
