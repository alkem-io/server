import { ClassificationCardinality } from '@common/enums/classification.cardinality';
import { IClassificationValue } from '@domain/common/classification-value/classification.value.interface';

// One seeded Classification Template. `nameID` is the create-if-absent key
// WITHIN the dedicated platform pack (spec §Session 2026-08-11: "the
// platform Template Pack" is a home, and name-id uniqueness is scoped to a
// home) — never global, never matched against any other pack. Value ids are
// explicit and stable (research D-7): a seed default should not depend on
// slugification of a label that could later be edited.
export interface ClassificationTemplateDefinition {
  nameID: string;
  displayName: string;
  description: string;
  cardinality: ClassificationCardinality;
  values: IClassificationValue[];
}
