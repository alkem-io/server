import { CalloutGroup } from '@common/enums/callout.group';
import { CalloutState } from '@common/enums/callout.state';
import { UpdateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { UpdateCalloutCanvasTemplateInput } from './callout.dto.update.canvasTemplate';
import { UpdateCalloutCardTemplateInput } from './callout.dto.update.cardTemplate';

@InputType()
export class UpdateCalloutInput extends UpdateNameableInput {
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

  @Field(() => CalloutGroup, {
    nullable: true,
    description: 'Set callout group for this Callout.',
  })
  group?: CalloutGroup;
}
