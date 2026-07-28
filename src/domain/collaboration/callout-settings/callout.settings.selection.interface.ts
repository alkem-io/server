import { CalloutSelectionMode } from '@common/enums/callout.selection.mode';
import { Field, ID, ObjectType } from '@nestjs/graphql';

/**
 * The per-callout selection settings block — valid only on collection callouts
 * (framing.type ∈ {CONTRIBUTORS, SPACES}). Absent at read time ⇒ AUTO.
 *
 * One shared block for BOTH collection kinds (workspace#025-callout-manual-selection,
 * architect ruling). The callout's kind routes which host set validates/resolves.
 */
@ObjectType('CalloutSelectionSettings')
export abstract class ICalloutSelectionSettings {
  @Field(() => CalloutSelectionMode, {
    nullable: false,
    description:
      'The selection mode: AUTO (full computed set) or CUSTOM (admin-curated subset).',
  })
  mode!: CalloutSelectionMode;

  @Field(() => [ID], {
    nullable: false,
    description:
      'The selected actor/space IDs in CUSTOM mode (0–500 entries). Ignored when mode is AUTO.',
  })
  selectedIds!: string[];
}
