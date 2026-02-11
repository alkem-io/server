import { IPost } from '@domain/collaboration/post/post.interface';
import { IClassification } from '@domain/common/classification/classification.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { IRoom } from '@domain/communication/room/room.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { ICalloutContribution } from '../callout-contribution/callout.contribution.interface';
import { ICalloutContributionDefaults } from '../callout-contribution-defaults/callout.contribution.defaults.interface';
import { ICalloutFraming } from '../callout-framing/callout.framing.interface';
import { ICalloutSettings } from '../callout-settings/callout.settings.interface';
import { ICalloutsSet } from '../callouts-set/callouts.set.interface';

@ObjectType('Callout')
export abstract class ICallout extends IAuthorizable {
  @Field(() => NameID, {
    nullable: false,
    description:
      'A name identifier of the entity, unique within a given scope.',
  })
  nameID!: string;

  @Field(() => ICalloutFraming, {
    nullable: false,
    description: 'The Callout Framing associated with this Callout.',
  })
  framing!: ICalloutFraming;

  @Field(() => ICalloutSettings, {
    nullable: false,
    description: 'The Callout Settings associated with this Callout.',
  })
  settings!: ICalloutSettings;

  classification!: IClassification;

  contributionDefaults?: ICalloutContributionDefaults;

  @Field(() => [IPost], {
    nullable: true,
    description: 'The Posts associated with this Callout.',
  })
  posts?: IPost[];

  // exposed via field resolver
  whiteboards?: IWhiteboard[];

  contributions?: ICalloutContribution[];

  comments?: IRoom;

  @Field(() => Number, {
    nullable: false,
    description: 'The sorting order for this Callout.',
  })
  sortOrder!: number;

  activity!: number;

  createdBy?: string;
  publishedBy?: string;
  publishedDate?: Date;

  calloutsSet?: ICalloutsSet;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Whether this callout is a Template or not.',
  })
  isTemplate!: boolean;
}
