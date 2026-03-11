import { registerEnumType } from '@nestjs/graphql';

export enum SpaceSortMode {
  ALPHABETICAL = 'alphabetical',
  CUSTOM = 'custom',
}

registerEnumType(SpaceSortMode, {
  name: 'SpaceSortMode',
});
