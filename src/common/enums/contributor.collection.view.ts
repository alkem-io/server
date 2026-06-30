import { registerEnumType } from '@nestjs/graphql';

export enum ContributorCollectionView {
  LIST = 'list',
  MAP = 'map',
}

registerEnumType(ContributorCollectionView, {
  name: 'ContributorCollectionView',
  description:
    'The default display mode for a contributor-collection callout framing.',
});
