import { SMALL_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { Field, ObjectType } from '@nestjs/graphql';

// The shared leaf shape embedded inside a Classification Template's
// `classificationValueSet` (domain/template) and copied verbatim into every
// `ClassificationEntry.valueSet` snapshot (domain/space/classification.entry).
// Lives here, in domain/common, rather than inside either consumer, so
// importing it never implies a relationship between the two modules.
export interface IClassificationValue {
  // Stable identifier — the aggregation key (SC-007). Copied verbatim into
  // every snapshot; never re-derived when the label is later renamed.
  id: string;
  // Human-readable, single-language display label.
  label: string;
}

@ObjectType('ClassificationValue', {
  description: "One selectable option in a classification's vocabulary.",
})
export abstract class ClassificationValue implements IClassificationValue {
  @Field(() => String, {
    nullable: false,
    description:
      'Stable identifier — aggregation key. Copied verbatim into every snapshot; never re-derived on rename.',
  })
  id!: string;

  @Field(() => String, {
    nullable: false,
    description: 'Human-readable, single-language label.',
  })
  label!: string;
}

// Referenced by the id-derivation and uniqueness validators (SMALL_TEXT_LENGTH
// bounds an explicit id override the same way it bounds other short identifiers).
export const CLASSIFICATION_VALUE_ID_MAX_LENGTH = SMALL_TEXT_LENGTH;

// FR-002a: 1 <= values.length <= 50, on every write path (template create/edit,
// entry add-from-template, ad-hoc create, entry definition edit).
export const CLASSIFICATION_VALUE_SET_MIN_SIZE = 1;
export const CLASSIFICATION_VALUE_SET_MAX_SIZE = 50;
