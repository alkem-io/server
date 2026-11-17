import { AuthorizationPrivilege } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationService } from '@core/authorization/authorization.service';
import {
  PlatformAuthorizationPolicyLoaderCreator,
  ProfileLoaderCreator,
} from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { IActor } from '@domain/actor/actor/actor.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ITemplatesSet } from '@domain/template/templates-set';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthorizationActorHasPrivilege,
  CurrentActor,
} from '@src/common/decorators';
import { InnovationPack } from './innovation.pack.entity';
import { IInnovationPack } from './innovation.pack.interface';
import { InnovationPackService } from './innovation.pack.service';

@Resolver(() => IInnovationPack)
export class InnovationPackResolverFields {
  constructor(
    private innovationPackService: InnovationPackService,
    private authorizationService: AuthorizationService
  ) {}

  /**
   * The platform-promote flag, visible only to PLATFORM_PROMOTE_MANAGE
   * holders (Content Full Access, License Manager); null for everyone else,
   * never an error. The platform policy comes from a per-request loader, so a
   * list of N rows costs one lookup.
   */
  @ResolveField('promote', () => Boolean, {
    nullable: true,
    description:
      'Whether this InnovationPack is platform-promoted (listed first). Null unless the caller may manage promotion (Platform Content Full Access or Platform License Manager).',
  })
  async promote(
    @Parent() innovationPack: IInnovationPack,
    @CurrentActor() actorContext: ActorContext,
    @Loader(PlatformAuthorizationPolicyLoaderCreator)
    loader: ILoader<IAuthorizationPolicy>
  ): Promise<boolean | null> {
    const platformPolicy = await loader.load(
      PlatformAuthorizationPolicyLoaderCreator.KEY
    );
    if (
      !this.authorizationService.isAccessGranted(
        actorContext,
        platformPolicy,
        AuthorizationPrivilege.PLATFORM_PROMOTE_MANAGE
      )
    ) {
      return null;
    }
    return innovationPack.promote ?? null;
  }

  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for this InnovationPack.',
  })
  async profile(
    @Parent() pack: IInnovationPack,
    @Loader(ProfileLoaderCreator, { parentClassRef: InnovationPack })
    loader: ILoader<IProfile>
  ): Promise<IProfile> {
    return loader.load(pack.id);
  }

  @AuthorizationActorHasPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('templatesSet', () => ITemplatesSet, {
    nullable: true,
    description: 'The templatesSet in use by this InnovationPack',
  })
  async templatesSet(
    @Parent() innovationPack: IInnovationPack
  ): Promise<ITemplatesSet> {
    return await this.innovationPackService.getTemplatesSetOrFail(
      innovationPack.id
    );
  }

  @ResolveField('provider', () => IActor, {
    nullable: false,
    description: 'The InnovationPack provider.',
  })
  async provider(@Parent() innovationPack: IInnovationPack): Promise<IActor> {
    return await this.innovationPackService.getProvider(innovationPack.id);
  }
}
