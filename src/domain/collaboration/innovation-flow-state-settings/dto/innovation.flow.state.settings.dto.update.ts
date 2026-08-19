import { CalloutDescriptionDisplayMode } from '@common/enums/callout.description.display.mode';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateInnovationFlowStateSettingsInput {
  @Field(() => Boolean, {
    nullable: true,
    description:
      'Optional. Sets whether new callouts can be added to this State; omission leaves the stored value unchanged.',
  })
  allowNewCallouts?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Optional. Sets whether the phase is shown in member-facing navigation; omission leaves the stored value unchanged.',
  })
  visible?: boolean;

  @Field(() => CalloutDescriptionDisplayMode, {
    nullable: true,
    description:
      'Optional. Sets how Post descriptions in this State are displayed in the feed; omission leaves the stored value unchanged.',
  })
  descriptionDisplayMode?: CalloutDescriptionDisplayMode;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Optional. Sets whether Posts in this State show publish details (publisher, publish date, avatar) in the feed; omission leaves the stored value unchanged.',
  })
  showPublishDetails?: boolean;
}
