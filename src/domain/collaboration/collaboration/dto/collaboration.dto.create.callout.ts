import { LONG_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@common/constants';
import { CalloutState } from '@common/enums/callout.state';
import { CalloutType } from '@common/enums/callout.type';
import { UUID } from '@domain/common/scalars';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { CreateAspectTemplateInput } from '@domain/template/aspect-template/dto/aspect.template.dto.create';
import { CreateCanvasTemplateInput } from '@domain/template/canvas-template/dto/canvas.template.dto.create';
import { InputType, Field } from '@nestjs/graphql';
import { MaxLength, MinLength } from 'class-validator';

@InputType()
export class CreateCalloutOnCollaborationInput {
  @Field(() => UUID, { nullable: false })
  collaborationID!: string;

  @Field({ nullable: false, description: 'The display name for the entity.' })
  @MinLength(3)
  @MaxLength(SMALL_TEXT_LENGTH)
  displayName!: string;

  @Field(() => Markdown, {
    description: 'Callout description.',
  })
  @MaxLength(LONG_TEXT_LENGTH)
  description!: string;

  @Field(() => CalloutType, {
    description: 'Callout type.',
  })
  type!: CalloutType;

  @Field(() => CalloutState, {
    nullable: true,
    description: 'State of the callout.',
  })
  state!: CalloutState;

  @Field(() => Number, {
    nullable: true,
    description: 'The sort order to assign to this Callout.',
  })
  sortOrder!: number;

  @Field(() => CreateAspectTemplateInput, {
    nullable: true,
    description: 'CardTemplate data for Card Callouts.',
  })
  cardTemplate?: CreateAspectTemplateInput;

  @Field(() => CreateCanvasTemplateInput, {
    nullable: true,
    description: 'CanvasTemplate data for Canvas Callouts.',
  })
  canvasTemplate?: CreateCanvasTemplateInput;
}
