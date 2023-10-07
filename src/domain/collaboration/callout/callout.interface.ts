import { IPost } from '@domain/collaboration/post/post.interface';
import { ObjectType, Field } from '@nestjs/graphql';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { CalloutType } from '@common/enums/callout.type';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { IRoom } from '@domain/communication/room/room.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { ICalloutFraming } from '../callout-framing/callout.framing.interface';
import { ICalloutContributionPolicy } from '../callout-contribution-policy/callout.contribution.policy.interface';
import { ICalloutContributionDefaults } from '../callout-contribution-defaults/callout.contribution.defaults.interface';
import { ICalloutContribution } from '../callout-contribution/callout.contribution.interface';

@ObjectType('Callout')
export abstract class ICallout extends IAuthorizable {
  @Field(() => NameID, {
    nullable: false,
    description:
      'A name identifier of the entity, unique within a given scope.',
  })
  nameID!: string;

  @Field(() => CalloutType, {
    description: 'The Callout type, e.g. Post, Whiteboard, Discussion',
  })
  type!: CalloutType;

  @Field(() => CalloutVisibility, {
    description: 'Visibility of the Callout.',
  })
  visibility!: CalloutVisibility;

  @Field(() => ICalloutFraming, {
    nullable: false,
    description: 'The Callout Framing associated with this Callout.',
  })
  framing!: ICalloutFraming;

  contributionPolicy!: ICalloutContributionPolicy;
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
  publishedBy!: string;
  publishedDate!: Date;
}
