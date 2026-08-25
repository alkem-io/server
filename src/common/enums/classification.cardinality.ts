import { registerEnumType } from '@nestjs/graphql';

// Deliberately not reusing TagsetType (SELECT_ONE / SELECT_MANY / FREEFORM):
// a Classification value set is never freeform, and coupling the two enums
// would make an unrelated Tagset change a breaking change for Classifications.
export enum ClassificationCardinality {
  SINGLE_SELECT = 'single-select',
  MULTI_SELECT = 'multi-select',
}

registerEnumType(ClassificationCardinality, {
  name: 'ClassificationCardinality',
});
