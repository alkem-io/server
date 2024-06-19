import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { AiPersona } from './ai.persona.entity';
import { AiPersonaService } from './ai.persona.service';
import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { CurrentUser, Profiling } from '@common/decorators';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { IAiPersona } from './ai.persona.interface';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { ProfileLoaderCreator } from '@core/dataloader/creators';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { IProfile } from '@domain/common/profile';

@Resolver(() => IAiPersona)
export class AiPersonaResolverFields {
  constructor(
    private authorizationService: AuthorizationService,
    private aiPersonaService: AiPersonaService
  ) {}

  @UseGuards(GraphqlGuard)
  @ResolveField('authorization', () => IAuthorizationPolicy, {
    nullable: true,
    description: 'The Authorization for this Virtual.',
  })
  @Profiling.api
  async authorization(
    @Parent() parent: AiPersona,
    @CurrentUser() agentInfo: AgentInfo
  ) {
    // Reload to ensure the authorization is loaded
    const aiPersona = await this.aiPersonaService.getAiPersonaOrFail(parent.id);

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      aiPersona.authorization,
      AuthorizationPrivilege.READ,
      `virtual authorization access: ${aiPersona.id}`
    );

    return aiPersona.authorization;
  }

  // Check authorization inside the field resolver
  @UseGuards(GraphqlGuard)
  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for the AiPersona.',
  })
  async profile(
    @Parent() aiPersona: AiPersona,
    @CurrentUser() agentInfo: AgentInfo,
    @Loader(ProfileLoaderCreator, { parentClassRef: AiPersona })
    loader: ILoader<IProfile>
  ): Promise<IProfile> {
    const profile = await loader.load(aiPersona.id);
    // Check if the user can read the profile entity, not the space
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      profile.authorization,
      AuthorizationPrivilege.READ,
      `read profile on space: ${profile.displayName}`
    );
    return profile;
  }
}
