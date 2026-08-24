import {
  ENUM_LENGTH,
  SMALL_TEXT_LENGTH,
} from '@common/constants/entity.field.length.constants';
import { ClassificationCardinality } from '@common/enums/classification.cardinality';
import { IClassificationValue } from '@domain/common/classification-value/classification.value.interface';
import { BaseAlkemioEntity } from '@domain/common/entity/base-entity/base.alkemio.entity';
import { SpaceAbout } from '@domain/space/space.about/space.about.entity';
import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { IClassificationEntry } from './classification.entry.interface';

// One vocabulary group on a Space's About (the spec's "a Classification").
// Extends BaseAlkemioEntity, NOT AuthorizableEntity — entries carry no policy
// of their own; every write authorizes UPDATE against the OWNING SpaceAbout's
// existing policy (operator ruling D1). No FK to any template and no FK to
// the pre-existing `Classification` container — both are deliberate: the
// snapshot rule (SC-003) is structural because there is nothing to point
// back to.
@Entity()
export class ClassificationEntry
  extends BaseAlkemioEntity
  implements IClassificationEntry
{
  // Bounded like the validator's SMALL_TEXT_LENGTH guard — internal callers
  // (addFromTemplate, bootstrap) bypass the DTO pipe, so the column itself
  // must not be an unbounded text sink.
  @Column('varchar', { length: SMALL_TEXT_LENGTH, nullable: false })
  displayLabel!: string;

  @Column('varchar', { length: ENUM_LENGTH, nullable: false })
  cardinality!: ClassificationCardinality;

  // Ordered snapshot vocabulary, copied verbatim at add time. Never re-sorted
  // (I-6) — display order IS authored order.
  @Column('jsonb', { nullable: false })
  valueSet!: IClassificationValue[];

  @Column('jsonb', { nullable: false, default: [] })
  selectedValueIDs!: string[];

  // Render-only (FR-010b/FR-010d): false means "not shown on the Space page",
  // never an access control. Defaults to shown.
  @Column('boolean', { nullable: false, default: true })
  display!: boolean;

  // Render order on the owning About — order of addition, oldest first
  // (FR-018b). Allocated as max(sibling) + 1 by the service on insert (I-8).
  @Column('int', { nullable: false })
  sortOrder!: number;

  @Index('IDX_classification_entry_spaceAboutId')
  @ManyToOne(
    () => SpaceAbout,
    spaceAbout => spaceAbout.classifications,
    {
      eager: false,
      cascade: false,
      onDelete: 'CASCADE',
    }
  )
  spaceAbout?: SpaceAbout;
}
