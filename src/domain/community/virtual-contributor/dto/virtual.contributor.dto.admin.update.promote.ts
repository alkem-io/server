import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

/**
 * Sets the platform-promote flag of a VirtualContributor. Admin-only (gated on
 * the platform policy's PLATFORM_PROMOTE_MANAGE, never on the VC's own
 * policy), hence the `admin` prefix.
 */
@InputType()
export class AdminUpdateVirtualContributorPromoteInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The VirtualContributor whose promote flag is to be set.',
  })
  virtualContributorID!: string;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'True to list this VirtualContributor first on the platform-wide listings.',
  })
  promote!: boolean;
}
