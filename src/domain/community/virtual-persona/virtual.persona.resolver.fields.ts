import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { VirtualPersona } from './virtual.persona.entity';
import { VirtualPersonaService } from './virtual.persona.service';
import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { CurrentUser, Profiling } from '@common/decorators';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { IVirtualPersona } from './virtual.persona.interface';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { ProfileLoaderCreator } from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { IProfile } from '@domain/common/profile';

@Resolver(() => IVirtualPersona)
export class VirtualPersonaResolverFields {
  constructor(
    private authorizationService: AuthorizationService,
    private virtualPersonaService: VirtualPersonaService
  ) {}

  @UseGuards(GraphqlGuard)
  @ResolveField('authorization', () => IAuthorizationPolicy, {
    nullable: true,
    description: 'The Authorization for this Virtual.',
  })
  @Profiling.api
  async authorization(
    @Parent() parent: VirtualPersona,
    @CurrentUser() agentInfo: AgentInfo
  ) {
    // Reload to ensure the authorization is loaded
    const virtualPersona =
      await this.virtualPersonaService.getVirtualPersonaOrFail(parent.id);

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      virtualPersona.authorization,
      AuthorizationPrivilege.READ,
      `virtual authorization access: ${virtualPersona.id}`
    );

    return virtualPersona.authorization;
  }

  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for this VirtualPersona.',
  })
  @UseGuards(GraphqlGuard)
  async profile(
    @Parent() parent: VirtualPersona,
    @CurrentUser() agentInfo: AgentInfo,
    @Loader(ProfileLoaderCreator, { parentClassRef: VirtualPersona })
    loader: ILoader<IProfile>
  ): Promise<IProfile> {
    const profile = await loader.load(parent.id);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      profile.authorization,
      AuthorizationPrivilege.READ,
      `read profile on User: ${profile.displayName}`
    );
    return profile;
  }
}
