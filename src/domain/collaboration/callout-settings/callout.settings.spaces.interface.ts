import { SpaceCollectionCardVariant } from '@common/enums/space.collection.card.variant';
import { Field, ObjectType } from '@nestjs/graphql';

/**
 * The per-callout card-variant settings block — valid only on a SPACES
 * (Subspaces) collection callout. Absent at read time ⇒ COMPACT.
 */
@ObjectType('CalloutSpacesSettings')
export abstract class ICalloutSpacesSettings {
  @Field(() => SpaceCollectionCardVariant, {
    nullable: false,
    description:
      'The card variant to render for each subspace: COMPACT (default) or EXPANDED.',
  })
  cardVariant!: SpaceCollectionCardVariant;
}
