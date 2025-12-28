import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationActorPrivilege } from '@src/common/decorators';
import { ITemplatesSet } from '@domain/template/templates-set';
import { IInnovationPack } from './innovation.pack.interface';
import { InnovationPackService } from './innovation.pack.service';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ProfileLoaderCreator } from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { InnovationPack } from './innovation.pack.entity';
import { IActor } from '@domain/actor/actor/actor.interface';

@Resolver(() => IInnovationPack)
export class InnovationPackResolverFields {
  constructor(private innovationPackService: InnovationPackService) {}

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

  @AuthorizationActorPrivilege(AuthorizationPrivilege.READ)
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
