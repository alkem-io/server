import { Field, InputType } from '@nestjs/graphql';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';
import { UUID } from '@domain/common/scalars';

@InputType()
export class SetPlatformWellKnownVirtualContributorInput {
  @Field(() => VirtualContributorWellKnown, {
    nullable: false,
    description: 'The well-known Virtual Contributor type.',
  })
  wellKnown!: VirtualContributorWellKnown;

  @Field(() => UUID, {
    nullable: false,
    description: 'The UUID of the Virtual Contributor.',
  })
  virtualContributorID!: string;
}
