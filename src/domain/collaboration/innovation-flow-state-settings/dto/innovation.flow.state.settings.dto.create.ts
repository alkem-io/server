import { CalloutDescriptionDisplayMode } from '@common/enums/callout.description.display.mode';
import { Field, InputType, ObjectType } from '@nestjs/graphql';

@InputType()
@ObjectType('CreateInnovationFlowStateSettingsData')
export class CreateInnovationFlowStateSettingsInput {
  @Field(() => Boolean, {
    nullable: false,
    description: 'The flag to set.',
  })
  allowNewCallouts!: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Optional. Whether the phase is shown in member-facing navigation. Defaults to true when omitted.',
  })
  visible?: boolean;

  @Field(() => CalloutDescriptionDisplayMode, {
    nullable: true,
    description:
      'Optional. How Post descriptions in this State are displayed in the feed: expanded or collapsed. Defaults to EXPANDED when omitted.',
  })
  descriptionDisplayMode?: CalloutDescriptionDisplayMode;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Optional. Whether Posts in this State show publish details in the feed. Defaults to true when omitted.',
  })
  showPublishDetails?: boolean;
}
