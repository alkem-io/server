import { LogContext } from '@common/enums';
import { ActorType } from '@common/enums/actor.type';
import { RelationshipNotFoundException } from '@common/exceptions';
import { ICredential } from '@domain/actor/credential/credential.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { INameable } from '@domain/common/entity/nameable-entity';
import { IProfile } from '@domain/common/profile/profile.interface';
import { NameID, UUID } from '@domain/common/scalars';
import { Field, InterfaceType, ObjectType } from '@nestjs/graphql';

// Note: INameable provides nameID! and profile! (inherited from IAuthorizable which provides authorization?)

/**
 * IActor - Base interface for Actor entities + lightweight GraphQL type.
 *
 * As TypeScript interface: defines the contract for Actor entities.
 * As GraphQL type: lightweight actor data for displays (no nameID, no child-specific fields).
 *
 * Typical GraphQL use cases:
 * - Provider/host attribution on cards
 * - Activity feed "triggered by" fields
 * - Member list displays
 * - Any place showing actor avatar + displayName
 */
@ObjectType('Actor', {
  description:
    'Lightweight actor data containing only base fields. Use for displays where nameID and child-specific fields are not needed.',
})
export abstract class IActor extends INameable {
  @Field(() => ActorType, {
    nullable: false,
    description: 'The type of Actor',
  })
  type!: ActorType;

  // INameable declares profile without @Field (uses field resolver on child types).
  // Re-declare here with @Field so the lightweight Actor GraphQL type exposes it.
  @Field(() => IProfile, {
    nullable: true,
    description: 'The profile for this Actor.',
  })
  declare profile: IProfile;

  // Credentials - exposed via IActorFull, not in lightweight IActor
  credentials?: ICredential[];
}

/**
 * IActorFull - Full GraphQL interface for actor data with type resolution.
 * Use this when you need nameID and type-specific fields.
 * Resolves to User, Organization, VirtualContributor, Space, or Account.
 *
 * Typical use cases:
 * - Actor detail pages
 * - When you need to access type-specific fields (email, phone, etc.)
 * - Mutations that return the full actor
 */
@InterfaceType('ActorFull', {
  resolveType(actor) {
    // Use lazy imports to avoid circular dependencies.
    // These imports are resolved at runtime when the function is called.
    // IMPORTANT: Use relative paths (not @domain aliases) because tsc does
    // not rewrite dynamic require() paths — only static import paths are
    // resolved. Using @domain here would rely on module-alias which
    // computes an incorrect base path in dist/src/ output structures.
    // Using the discriminator type field (not instanceof) so this works
    // even if TypeORM materialises a base Actor instance rather than a child class.
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { IUser } = require('../../community/user/user.interface');
    const {
      IOrganization,
    } = require('../../community/organization/organization.interface');
    const {
      IVirtualContributor,
    } = require('../../community/virtual-contributor/virtual.contributor.interface');
    const { ISpace } = require('../../space/space/space.interface');
    const { IAccount } = require('../../space/account/account.interface');
    /* eslint-enable @typescript-eslint/no-require-imports */

    switch (actor.type) {
      case ActorType.USER:
        return IUser;
      case ActorType.ORGANIZATION:
        return IOrganization;
      case ActorType.VIRTUAL_CONTRIBUTOR:
        return IVirtualContributor;
      case ActorType.SPACE:
        return ISpace;
      case ActorType.ACCOUNT:
        return IAccount;
      default:
        throw new RelationshipNotFoundException(
          `Unable to determine actor type for ${actor.id}`,
          LogContext.COMMUNITY
        );
    }
  },
})
export abstract class IActorFull {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the Actor',
  })
  id!: string;

  @Field(() => ActorType, {
    nullable: false,
    description: 'The type of Actor',
  })
  type!: ActorType;

  @Field(() => NameID, {
    nullable: false,
    description: 'A name identifier of the Actor, unique within a given scope.',
  })
  nameID!: string;

  @Field(() => IAuthorizationPolicy, {
    nullable: true,
    description: 'The authorization rules for the Actor',
  })
  authorization?: IAuthorizationPolicy;

  @Field(() => [ICredential], {
    nullable: true,
    description: 'The credentials held by this Actor',
  })
  credentials?: ICredential[];

  @Field(() => IProfile, {
    nullable: true,
    description: 'The profile for this Actor.',
  })
  profile!: IProfile;

  @Field(() => Date, {
    description: 'The date at which the entity was created.',
    nullable: false,
  })
  createdDate!: Date;

  @Field(() => Date, {
    description: 'The date at which the entity was last updated.',
    nullable: false,
  })
  updatedDate!: Date;
}
