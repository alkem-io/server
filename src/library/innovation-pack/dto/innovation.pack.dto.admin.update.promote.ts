import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

/**
 * Sets the platform-promote flag of an InnovationPack. Admin-only (gated on
 * the platform policy's PLATFORM_PROMOTE_MANAGE, never on the pack's own
 * policy), hence the `admin` prefix.
 */
@InputType()
export class AdminUpdateInnovationPackPromoteInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The InnovationPack whose promote flag is to be set.',
  })
  innovationPackID!: string;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'True to list this InnovationPack first in the Innovation Library.',
  })
  promote!: boolean;
}
