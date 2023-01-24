import { LONG_TEXT_LENGTH } from '@common/constants';
import { CalloutState } from '@common/enums/callout.state';
import { UpdateNameableInput } from '@domain/common/entity/nameable-entity/nameable.dto.update';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { UpdateCalloutCanvasTemplateInput } from './callout.dto.update.canvasTemplate';
import { UpdateCalloutCardTemplateInput } from './callout.dto.update.cardTemplate';

@InputType()
export class UpdateCalloutInput extends UpdateNameableInput {
  @Field(() => Markdown, {
    nullable: true,
    description: 'Callout description.',
  })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  description?: string;

  @Field(() => CalloutState, {
    nullable: true,
    description: 'State of the callout.',
  })
  state?: CalloutState;

  @Field(() => Number, {
    nullable: true,
    description: 'The sort order to assign to this Callout.',
  })
  sortOrder!: number;

  @Field(() => UpdateCalloutCardTemplateInput, {
    nullable: true,
    description: 'CardTemplate data for this Callout.',
  })
  cardTemplate?: UpdateCalloutCardTemplateInput;

  @Field(() => UpdateCalloutCanvasTemplateInput, {
    nullable: true,
    description: 'CanvasTemplate data for this Callout.',
  })
  canvasTemplate?: UpdateCalloutCanvasTemplateInput;
}
