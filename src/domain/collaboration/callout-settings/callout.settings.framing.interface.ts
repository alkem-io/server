import { Field, ObjectType } from '@nestjs/graphql';
import { ICalloutContributorsSettings } from './callout.settings.contributors.interface';

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
}
