import { registerEnumType } from '@nestjs/graphql';

export enum TagsetType {
  FREEFORM = 'freeform',
  SELECT_ONE = 'select-one',
  SELECT_MANY = 'select-many',
}

registerEnumType(TagsetType, {
  name: 'TagsetType',
});
