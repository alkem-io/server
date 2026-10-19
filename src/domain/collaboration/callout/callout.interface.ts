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
import {
  ICalloutReaction,
  ICalloutReactionsSummary,
} from './dto/callout.dto.reaction';

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

  // The description lives HERE and not on CalloutResolverFields.settings: with
  // the field declared in both places the model's @Field wins the SDL, so a
  // description on the resolve field is silently discarded and documents the
  // behaviour nowhere a consumer can see it (review ENG-084-R-04).
  @Field(() => ICalloutSettings, {
    nullable: false,
    description:
      'The Callout Settings associated with this Callout. `framing.selection.selectedIds` is returned EMPTY to actors without UPDATE on the Callout, so an empty list is AMBIGUOUS by design: it means either that nothing is selected or that the selection is withheld from you, and the two are deliberately indistinguishable (workspace#084 AC6: a viewer must not learn which or how many spaces are hidden from them). Hold UPDATE and the list is exact. `framing.selection.mode` is always accurate.',
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

  @Field(() => ICalloutReactionsSummary, {
    nullable: false,
    description:
      'Cheap always-shown summary (tier-1). Dataloader-batched; safe to select on feeds.',
  })
  reactionsSummary?: ICalloutReactionsSummary;

  @Field(() => [ICalloutReaction], {
    nullable: false,
    description:
      'Who reacted (tier-2). Bounded: 100 most recent by last change, descending. Fetch only on demand.',
  })
  reactions?: ICalloutReaction[];
}
