import { UUID } from '@domain/common/scalars';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { Field, InputType } from '@nestjs/graphql';

/**
 * 027-platform-role-redesign (T078, FR-020) — the single generic entry point
 * for renaming an ACTOR (user / organization / virtual-contributor).
 *
 * FR-020 requires one mechanism applied uniformly rather than a per-type ad
 * hoc field: a nameID is the entity's URL path, so changing it breaks every
 * inbound link and every bookmark. That is why it left the
 * `updateXPlatformSettings` mutations (a nameID is not a platform *setting*)
 * and why it may not ride an ordinary field edit.
 */
@InputType()
export class UpdateActorNameIDInput {
  @Field(() => UUID, {
    nullable: false,
    description:
      'The Actor (User, Organization or VirtualContributor) to rename.',
  })
  actorID!: string;

  @Field(() => NameID, {
    nullable: false,
    description: 'The new URL path (nameID) for the Actor.',
  })
  nameID!: string;
}
