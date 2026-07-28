import { registerEnumType } from '@nestjs/graphql';

export enum CalloutSelectionMode {
  AUTO = 'auto',
  CUSTOM = 'custom',
}

registerEnumType(CalloutSelectionMode, {
  name: 'CalloutSelectionMode',
  description:
    'The selection mode for a collection callout (Contributors or Subspaces). AUTO (default) returns the full computed set; CUSTOM restricts to the admin-curated selectedIds list.',
});
