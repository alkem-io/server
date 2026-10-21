import { NameID, UUID } from '@domain/common/scalars';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { Field, ObjectType } from '@nestjs/graphql';

/**
 * How much of an account's hosted resources a profile viewer may see. Never
 * exposed in the schema; computed by the User / Organization profile
 * resolvers from the viewer's relationship to the profile.
 * - FULL: the viewers who can already read the account itself.
 * - ORGANIZATION_ASSOCIATE: associates, admins and owners of the
 *   organization that hosts the account.
 * - REGISTERED: any other signed-in viewer.
 */
export type HostedResourcesViewerScope =
  | 'FULL'
  | 'ORGANIZATION_ASSOCIATE'
  | 'REGISTERED';

/**
 * Closed card projection of a Virtual Contributor hosted by an account.
 *
 * It carries the Virtual Contributor's identity and, through its single
 * field resolver, its world-readable profile — nothing else, ever. A viewer
 * of the host's profile may be allowed to see the card without holding READ
 * on the Virtual Contributor itself, so adding any further field here would
 * open a read path around the Virtual Contributor's own authorization.
 */
@ObjectType('AccountHostedVirtualContributor', {
  description:
    'A hosted Virtual Contributor card: its identity and profile only.',
})
export class IAccountHostedVirtualContributor {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the Virtual Contributor.',
  })
  id!: string;
}

/**
 * Closed card projection of an Innovation Hub hosted by an account.
 *
 * It carries the hub's identity, its nameID and, through its single field
 * resolver, its profile — nothing else, ever. Every Innovation Hub of the
 * account is listed to every signed-in viewer, whatever its visibility, and
 * the full `InnovationHub` type reaches back to the hosting account
 * (`InnovationHub.account`), whose lists are not filtered by visibility.
 * Returning the full type here would therefore hand any viewer the account's
 * Account- and Hidden-visibility packs and Virtual Contributors inside the
 * same response, undoing the filter of the sibling lists. Adding any further
 * field to this card risks reopening that path.
 */
@ObjectType('AccountHostedInnovationHub', {
  description:
    'A hosted Innovation Hub card: its identity, nameID and profile only.',
})
export class IAccountHostedInnovationHub {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID of the Innovation Hub.',
  })
  id!: string;

  @Field(() => NameID, {
    nullable: false,
    description: 'The nameID of the Innovation Hub.',
  })
  nameID!: string;
}

@ObjectType('AccountHostedResources', {
  description:
    'Resources hosted by an Account, as the current viewer may see them.',
})
export class IAccountHostedResources {
  @Field(() => [IAccountHostedVirtualContributor], {
    nullable: false,
    description:
      'Virtual Contributors of the Account that the current viewer may see.',
  })
  virtualContributors!: IAccountHostedVirtualContributor[];

  @Field(() => [IInnovationPack], {
    nullable: false,
    description:
      'Innovation Packs of the Account that the current viewer may see.',
  })
  innovationPacks!: IInnovationPack[];

  @Field(() => [IAccountHostedInnovationHub], {
    nullable: false,
    description: 'The Innovation Hubs hosted by the Account.',
  })
  innovationHubs!: IAccountHostedInnovationHub[];
}
