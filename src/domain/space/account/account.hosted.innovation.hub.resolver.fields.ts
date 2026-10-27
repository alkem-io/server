import { ProfileLoaderCreator } from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { InnovationHub } from '@domain/innovation-hub/innovation.hub.entity';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IAccountHostedInnovationHub } from './dto/account.hosted.resources';

/**
 * Field resolvers of the closed Innovation Hub card returned by
 * `hostedResources` on User and Organization.
 *
 * Invariant: the card exposes exactly three fields, `id`, `nameID` and
 * `profile`. Never add another Innovation Hub field here — in particular not
 * `account` or `provider`: the hubs are listed to every signed-in viewer
 * whatever their visibility, and a way back to the hosting account would
 * expose the account's lists that `hostedResources` filters by visibility.
 */
@Resolver(() => IAccountHostedInnovationHub)
export class AccountHostedInnovationHubResolverFields {
  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The profile of this Innovation Hub.',
  })
  async profile(
    @Parent() parent: IAccountHostedInnovationHub,
    // Same loader and options as `InnovationHub.profile`: the data loader
    // interceptor shares one loader per creator and parent class within a
    // request, so the card deliberately imposes no check that field lacks.
    // Hub profiles are readable by every signed-in viewer by design.
    @Loader(ProfileLoaderCreator, { parentClassRef: InnovationHub })
    loader: ILoader<IProfile>
  ): Promise<IProfile> {
    return loader.load(parent.id);
  }
}
