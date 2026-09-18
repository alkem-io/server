import { ClassificationCardinality } from '@common/enums/classification.cardinality';
import { IClassificationValue } from '@domain/common/classification-value/classification.value.interface';
import { IBaseAlkemio } from '@domain/common/entity/base-entity/base.alkemio.interface';
import { ISpaceAbout } from '@domain/space/space.about/space.about.interface';
import { Field, Float, ObjectType } from '@nestjs/graphql';

@ObjectType('ClassificationEntry', {
  description:
    "One vocabulary group on a host entity — the spec's 'a Classification'.",
})
export abstract class IClassificationEntry extends IBaseAlkemio {
  @Field(() => String, {
    nullable: false,
    description:
      "Per-instance display label; defaults to the source template's, overridable to resolve a conflict.",
  })
  displayLabel!: string;

  @Field(() => ClassificationCardinality, {
    nullable: false,
    description: 'Whether one or several values may be selected.',
  })
  cardinality!: ClassificationCardinality;

  // The ordered snapshot vocabulary. Stored/service-facing name is
  // `valueSet` (data-model.md §1); the GraphQL-exposed name is `values`
  // (contract §1) — resolved by ClassificationEntryResolverFields, the same
  // rename pattern `selectedValues` and `Template.classification` use.
  valueSet!: IClassificationValue[];

  @Field(() => [String], {
    nullable: false,
    description: 'Ids of the currently selected values.',
  })
  selectedValueIDs!: string[];

  // Resolved-only field (see classification.entry.resolver.fields.ts) — no
  // stored column, hence optional here, unlike the columns above.
  selectedValues?: IClassificationValue[];

  @Field(() => Boolean, {
    nullable: false,
    description:
      "Render-only: false means 'not shown on the Space page'. NOT an access control.",
  })
  display!: boolean;

  @Field(() => Float, {
    nullable: false,
    description:
      'Render order on the host entity — order of addition, oldest first.',
  })
  sortOrder!: number;

  // Loaded relation, not exposed directly via GraphQL — used to authorize
  // and to resolve the owning About.
  spaceAbout?: ISpaceAbout;
}
