import { Field, ObjectType } from '@nestjs/graphql';
import { ICalloutContributorsSettings } from './callout.settings.contributors.interface';
import { ICalloutSelectionSettings } from './callout.settings.selection.interface';
import { ICalloutSpacesSettings } from './callout.settings.spaces.interface';

@ObjectType('CalloutSettingsFraming')
export abstract class ICalloutSettingsFraming {
  @Field(() => Boolean, {
    nullable: false,
    description: 'Can comment to callout framing.',
  })
  commentsEnabled!: boolean;

  @Field(() => ICalloutContributorsSettings, {
    nullable: true,
    description:
      'Configuration for a contributor-collection callout. Present only when framing.type = CONTRIBUTORS.',
  })
  contributors?: ICalloutContributorsSettings;

  @Field(() => ICalloutSelectionSettings, {
    nullable: true,
    description:
      'Manual-selection settings for collection callouts (CONTRIBUTORS or SPACES). Absent / null ⇒ AUTO (full computed set).',
  })
  selection?: ICalloutSelectionSettings;

  @Field(() => ICalloutSpacesSettings, {
    nullable: true,
    description:
      'Card-variant settings for a Subspaces collection callout. Present only on SPACES callouts. Absent / null ⇒ COMPACT.',
  })
  spaces?: ICalloutSpacesSettings;
}
