import { ActorType } from '@common/enums/actor.type';
import { ContributorCollectionView } from '@common/enums/contributor.collection.view';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CalloutContributorsSettings')
export abstract class ICalloutContributorsSettings {
  @Field(() => [ActorType], {
    nullable: false,
    description:
      'The contributor types included in this contributor-collection callout. At least one.',
  })
  contributorTypes!: ActorType[];

  @Field(() => ActorType, {
    nullable: false,
    description:
      'The contributor type shown first (the segmented switch opens on it). One of contributorTypes.',
  })
  defaultContributorType!: ActorType;

  @Field(() => ContributorCollectionView, {
    nullable: false,
    description: 'The default display mode (list or map).',
  })
  defaultView!: ContributorCollectionView;
}
