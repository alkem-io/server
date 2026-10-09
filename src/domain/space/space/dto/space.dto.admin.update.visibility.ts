import { SpaceVisibility } from '@common/enums/space.visibility';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

/**
 * 027-platform-role-redesign (T078, FR-020/FR-023, A14) — what is left of
 * `UpdateSpacePlatformSettingsInput` once `nameID` moves out. A nameID is not
 * a platform *setting*; it is the space's URL path, and it now travels
 * through the protected section of the general `updateSpace` mutation on
 * `UPDATE_NAMEID` (A17). What remains is genuinely admin-only, which is why
 * the mutation carries the `admin` prefix (FR-023).
 */
@InputType()
export class AdminUpdateSpaceVisibilityInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Space whose visibility is to be updated.',
  })
  spaceID!: string;

  @Field(() => SpaceVisibility, {
    nullable: false,
    description: 'Visibility of the Space, only on L0 spaces.',
  })
  visibility!: SpaceVisibility;
}
