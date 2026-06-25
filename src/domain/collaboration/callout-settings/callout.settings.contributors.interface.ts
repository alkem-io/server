import { ContributorCollectionView } from '@common/enums/contributor.collection.view';
import { ContributorType } from '@common/enums/contributor.type';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CalloutContributorsSettings')
export abstract class ICalloutContributorsSettings {
  @Field(() => [ContributorType], {
    nullable: false,
    description:
      'The contributor types included in this contributor-collection callout. At least one.',
  })
  contributorTypes!: ContributorType[];

  @Field(() => ContributorType, {
    nullable: false,
    description:
      'The contributor type shown first (the segmented switch opens on it). One of contributorTypes.',
  })
  defaultContributorType!: ContributorType;

  @Field(() => ContributorCollectionView, {
    nullable: false,
    description: 'The default display mode (list or map).',
  })
  defaultView!: ContributorCollectionView;
}
