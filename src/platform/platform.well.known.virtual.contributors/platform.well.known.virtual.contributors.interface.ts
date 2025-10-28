import { Field, ObjectType } from '@nestjs/graphql';
import { VirtualContributorWellKnown } from '@common/enums/virtual.contributor.well.known';

@ObjectType('PlatformWellKnownVirtualContributors')
export class IPlatformWellKnownVirtualContributors {
  @Field(() => String, {
    nullable: true,
    description: 'The UUID of the Guidance Virtual Contributor.',
  })
  [VirtualContributorWellKnown.GUIDANCE]?: string;
}
