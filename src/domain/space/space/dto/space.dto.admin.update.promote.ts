import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

/**
 * Sets the platform-promote flag of a Space at any level. Admin-only (gated on
 * the platform policy's PLATFORM_PROMOTE_MANAGE, never on the space's own
 * policy), hence the `admin` prefix like `AdminUpdateSpaceVisibilityInput`.
 */
@InputType()
export class AdminUpdateSpacePromoteInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Space (any level) whose promote flag is to be set.',
  })
  spaceID!: string;

  @Field(() => Boolean, {
    nullable: false,
    description: 'True to list this Space first on Explore Spaces.',
  })
  promote!: boolean;
}
