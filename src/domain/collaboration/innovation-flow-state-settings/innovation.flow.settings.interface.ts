import { CalloutDescriptionDisplayMode } from '@common/enums/callout.description.display.mode';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('InnovationFlowStateSettings')
export abstract class IInnovationFlowStateSettings {
  @Field(() => Boolean, {
    nullable: false,
    description: 'Whether new callouts can be added to this State.',
  })
  allowNewCallouts!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Whether this State/phase is shown in the member-facing navigation. Default true. UI-affordance only: it does NOT gate access to the phase content.',
  })
  visible!: boolean;

  @Field(() => CalloutDescriptionDisplayMode, {
    nullable: false,
    description:
      'How Post descriptions in this State are displayed in the feed: expanded or collapsed. Default expanded.',
  })
  descriptionDisplayMode!: CalloutDescriptionDisplayMode;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Whether Posts in this State show publish details (publisher, publish date, avatar) in the feed. Presentation only — does not restrict access to publisher data. Default true.',
  })
  showPublishDetails!: boolean;
}
