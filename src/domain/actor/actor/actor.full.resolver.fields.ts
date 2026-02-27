import { AuthorizationPrivilege } from '@common/enums';
import {
  AuthorizationLoaderCreator,
  ProfileLoaderCreator,
} from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { CredentialService, ICredential } from '@domain/actor/credential';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { IProfile } from '@domain/common/profile';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Actor } from './actor.entity';
import { IActorFull } from './actor.interface';

@Resolver(() => IActorFull)
export class ActorFullResolverFields {
  constructor(private credentialService: CredentialService) {}

  @ResolveField('profile', () => IProfile, {
    nullable: true,
    description: 'The profile for this Actor.',
  })
  async profile(
    @Parent() actor: Actor,
    @Loader(ProfileLoaderCreator, {
      parentClassRef: Actor,
      checkResultPrivilege: AuthorizationPrivilege.READ,
    })
    loader: ILoader<IProfile>
  ) {
    return loader.load(actor.id);
  }

  @ResolveField('authorization', () => IAuthorizationPolicy, {
    nullable: true,
    description: 'The authorization rules for this Actor.',
  })
  async authorization(
    @Parent() actor: Actor,
    @Loader(AuthorizationLoaderCreator, { parentClassRef: Actor })
    loader: ILoader<IAuthorizationPolicy>
  ) {
    return loader.load(actor.id);
  }

  @ResolveField('credentials', () => [ICredential], {
    nullable: true,
    description: 'The credentials held by this Actor.',
  })
  async credentials(@Parent() actor: Actor): Promise<ICredential[]> {
    return this.credentialService.findCredentialsByActorID(actor.id);
  }
}
