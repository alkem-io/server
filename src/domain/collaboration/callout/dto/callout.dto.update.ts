import { CalloutState } from '@common/enums/callout.state';
import { Field, InputType } from '@nestjs/graphql';
import { UpdateCalloutWhiteboardTemplateInput } from './callout.dto.update.whiteboardTemplate';
import { UpdateCalloutPostTemplateInput } from './callout.dto.update.postTemplate';
import { CalloutDisplayLocation } from '@common/enums/callout.display.location';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity/base.alkemio.dto.update';

@InputType()
export class UpdateCalloutInput extends UpdateBaseAlkemioInput {
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

  @Field(() => CalloutDisplayLocation, {
    nullable: true,
    description: 'Set display location for this Callout.',
  })
  displayLocation?: CalloutDisplayLocation;

  @Field(() => NameID, {
    nullable: true,
    description:
      'A display identifier, unique within the containing scope. Note: updating the nameID will affect URL on the client.',
  })
  nameID?: string;
}
