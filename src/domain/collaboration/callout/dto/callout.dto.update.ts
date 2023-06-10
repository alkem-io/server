import { CalloutState } from '@common/enums/callout.state';
import { UpdateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.update';
import { Field, InputType } from '@nestjs/graphql';
import { UpdateCalloutWhiteboardTemplateInput } from './callout.dto.update.whiteboardTemplate';
import { UpdateCalloutPostTemplateInput } from './callout.dto.update.postTemplate';

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

  @Field(() => UpdateCalloutPostTemplateInput, {
    nullable: true,
    description: 'PostTemplate data for this Callout.',
  })
  postTemplate?: UpdateCalloutPostTemplateInput;

  @Field(() => UpdateCalloutWhiteboardTemplateInput, {
    nullable: true,
    description: 'WhiteboardTemplate data for this Callout.',
  })
  whiteboardTemplate?: UpdateCalloutWhiteboardTemplateInput;

  @Field(() => String, {
    nullable: true,
    description: 'Set callout group for this Callout.',
  })
  group?: string;
}
