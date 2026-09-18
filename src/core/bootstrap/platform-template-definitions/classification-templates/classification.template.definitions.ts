import { ClassificationTemplateDefinition } from './classification.template.definition';
import { bootstrapClassificationTemplateSDGs } from './classification.template.sdgs';

// SDGs ONLY. FR-005a names SDGs as the vocabulary to seed and offers Language
// and Sector as *examples* ("e.g.") of what a platform admin might add later.
// It does not specify their values, and no external standard fixes them the
// way the UN fixes the 17 SDGs — so seeding an invented vocabulary would make
// one author's opinion the de-facto taxonomy for every Space on the instance.
// We ship none.
//
// Adding a vocabulary later is purely additive: append its definition to this
// array. The ensure step is create-if-absent keyed on `nameID` within the
// platform pack, so a new entry appears on the next bootstrap and every
// already-present template is left untouched.
export const bootstrapClassificationTemplateDefinitions: ClassificationTemplateDefinition[] =
  [bootstrapClassificationTemplateSDGs];
