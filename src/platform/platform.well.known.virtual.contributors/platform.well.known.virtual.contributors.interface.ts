import { Field, ObjectType } from '@nestjs/graphql';
import { PlatformWellKnownVirtualContributorMapping } from './dto/platform.well.known.virtual.contributor.dto.mapping';

@ObjectType('PlatformWellKnownVirtualContributors')
export class IPlatformWellKnownVirtualContributors {
  @Field(() => [PlatformWellKnownVirtualContributorMapping], {
    nullable: false,
    description:
      'The mappings of well-known Virtual Contributors to their UUIDs.',
  })
  mappings!: PlatformWellKnownVirtualContributorMapping[];
}
