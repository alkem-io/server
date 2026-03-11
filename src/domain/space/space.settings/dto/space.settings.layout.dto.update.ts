import { CalloutDescriptionDisplayMode } from '@common/enums/callout.description.display.mode';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateSpaceSettingsLayoutInput {
  @Field(() => CalloutDescriptionDisplayMode, {
    nullable: true,
    description: 'The default display mode for callout descriptions.',
  })
  calloutDescriptionDisplayMode?: CalloutDescriptionDisplayMode;
}
