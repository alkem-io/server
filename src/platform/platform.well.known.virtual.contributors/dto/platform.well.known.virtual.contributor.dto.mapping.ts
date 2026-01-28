import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, ObjectType } from '@nestjs/graphql';

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
