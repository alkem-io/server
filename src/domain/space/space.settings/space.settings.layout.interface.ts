import { CalloutDescriptionDisplayMode } from '@common/enums/callout.description.display.mode';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('SpaceSettingsLayout')
export abstract class ISpaceSettingsLayout {
  @Field(() => CalloutDescriptionDisplayMode, {
    nullable: false,
    description:
      'The default display mode for callout descriptions in this Space.',
  })
  calloutDescriptionDisplayMode!: CalloutDescriptionDisplayMode;
}
