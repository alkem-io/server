import { registerEnumType } from '@nestjs/graphql';

export enum SpaceCollectionCardVariant {
  COMPACT = 'compact',
  EXPANDED = 'expanded',
}

registerEnumType(SpaceCollectionCardVariant, {
  name: 'SpaceCollectionCardVariant',
  description:
    'The card variant of a Subspaces (SPACES) collection callout. COMPACT (default) shows the identity block only; EXPANDED adds the What/Why/Who excerpts.',
});
