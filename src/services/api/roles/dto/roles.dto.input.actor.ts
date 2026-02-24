import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { SpaceFilterInput } from '@services/infrastructure/space-filter/dto/space.filter.dto.input';

@InputType()
export class RolesActorInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the actor to retrieve the roles of.',
  })
  actorID!: string;

  @Field(() => SpaceFilterInput, {
    nullable: true,
    description: 'Return membership in Spaces matching the provided filter.',
  })
  filter?: SpaceFilterInput;
}

/** @deprecated Use RolesActorInput instead */
export const RolesUserInput = RolesActorInput;
/** @deprecated Use RolesActorInput instead */
export type RolesUserInput = RolesActorInput;
/** @deprecated Use RolesActorInput instead */
export const RolesOrganizationInput = RolesActorInput;
/** @deprecated Use RolesActorInput instead */
export type RolesOrganizationInput = RolesActorInput;
/** @deprecated Use RolesActorInput instead */
export const RolesVirtualContributorInput = RolesActorInput;
/** @deprecated Use RolesActorInput instead */
export type RolesVirtualContributorInput = RolesActorInput;
