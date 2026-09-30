import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';

/**
 * The informed-consent preview of ONE Space that accepting an invitation
 * joins (FR-013).
 *
 * Deliberately NOT `ISpaceAbout`. The `spacesToJoinOnAccept` field is gated
 * on ROLESET_ENTRY_ROLE_INVITE_ACCEPT — granted to account admins of the
 * INVITED actor — precisely so an organization's admins can preview the
 * chain without holding READ on it. Returning `ISpaceAbout` therefore handed
 * those admins the full About content (`why`, `who`, `profile.description`,
 * `references`, `tagsets`, `guidelines`, `classifications`) of private
 * ancestor Spaces, none of which carry a field-level authorization
 * decorator: the Space-level gate that normally fronts SpaceAbout was
 * bypassed by resolving it from the invitation instead.
 *
 * This type is the enumeration FR-013 actually needs, and matches exactly
 * what the equivalent email path already discloses — a display name and a
 * link. Any widening of it re-opens that leak, so add fields only with the
 * per-Space authorization filter this field intentionally does not apply.
 */
@ObjectType('SpaceJoinPreview')
export abstract class ISpaceJoinPreview {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the Space that will be joined.',
  })
  id!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The display name of the Space that will be joined.',
  })
  displayName!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The URL of the Space that will be joined.',
  })
  url!: string;
}
