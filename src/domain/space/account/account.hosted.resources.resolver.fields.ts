import { AuthorizationPrivilege } from '@common/enums';
import { HostedVirtualContributorProfileLoaderCreator } from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IAccountHostedVirtualContributor } from './dto/account.hosted.resources';

/**
 * Field resolvers of the closed Virtual Contributor card returned by
 * `hostedResources` on User and Organization.
 *
 * Invariant: the card exposes exactly two fields, `id` and `profile`. Never
 * add another Virtual Contributor field here — the viewer of a card may hold
 * no READ on the Virtual Contributor itself, so every extra field would be a
 * read path around its authorization.
 */
@Resolver(() => IAccountHostedVirtualContributor)
export class AccountHostedResourcesResolverFields {
  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The public profile of this Virtual Contributor.',
  })
  async profile(
    @Parent() parent: IAccountHostedVirtualContributor,
    @Loader(HostedVirtualContributorProfileLoaderCreator, {
      parentClassRef: VirtualContributor,
      checkResultPrivilege: AuthorizationPrivilege.READ,
    })
    loader: ILoader<IProfile>
  ): Promise<IProfile> {
    // Resolved under the profile's own READ rule (Virtual Contributor profiles
    // are world-readable by design), not the Virtual Contributor's: a viewer of
    // the host's profile may render the card without READ on the Virtual
    // Contributor itself.
    return loader.load(parent.id);
  }
}
