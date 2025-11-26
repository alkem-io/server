import { Field, ObjectType } from '@nestjs/graphql';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@ObjectType('PlatformWellKnownVirtualContributorMapping')
export class PlatformWellKnownVirtualContributorMapping {
  @Field(() => VirtualContributorWellKnown, {
    nullable: false,
    description: 'The well-known identifier for the Virtual Contributor.',
  })
  wellKnown!: VirtualContributorWellKnown;

  @Field(() => UUID, {
    nullable: false,
    description: 'The UUID of the Virtual Contributor.',
  })
  virtualContributorID!: string;
}
