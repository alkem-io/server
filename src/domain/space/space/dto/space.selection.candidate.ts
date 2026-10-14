import { SpaceLevel } from '@common/enums/space.level';
import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';

/**
 * A space of an account, reduced to what the Spaces-callout selection picker
 * needs (workspace#084 FR-008, FR-010..FR-013).
 *
 * A new DTO rather than `ISpace` because reusing `ISpace` would require adding
 * a parentage field to the type EVERY surface consumes, for one consumer, and
 * would reattach the candidate list to `ISpace.about` — the non-null field
 * whose denial path is the exact nullification failure the read-path filter
 * exists to avoid.
 *
 * FOUR fields. No avatar: the picker renders initials, never an image
 * (FR-012). No `inHostTree`: the "in this space" badge is derived on the
 * client from the ancestor chain it already builds over `parentSpaceID`
 * (FR-012b; spec A26). Do not re-add either — removing a field later is a
 * breaking schema change.
 */
@ObjectType('SpaceSelectionCandidate', {
  description:
    'A space of an account, reduced to what the Spaces-callout selection picker needs.',
})
export class ISpaceSelectionCandidate {
  @Field(() => UUID, {
    nullable: false,
    description: 'The unique identifier of this Space.',
  })
  id!: string;

  @Field(() => String, {
    nullable: false,
    description:
      "This Space's current display name, from its About profile (never the actor-level profile, which is a creation-time snapshot that is not re-synced on rename).",
  })
  displayName!: string;

  @Field(() => SpaceLevel, {
    nullable: false,
    description: 'The level of this Space (L0, L1 or L2).',
  })
  level!: SpaceLevel;

  @Field(() => UUID, {
    nullable: true,
    description: "The parent Space's id; NULL for a level-zero Space.",
  })
  parentSpaceID?: string;
}
