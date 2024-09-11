import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { VirtualContributor } from './virtual.contributor.entity';
import { VirtualContributorService } from './virtual.contributor.service';
import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { IProfile } from '@domain/common/profile';
import { AuthorizationAgentPrivilege, CurrentUser } from '@common/decorators';
import { IAgent } from '@domain/agent/agent';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { Loader } from '@core/dataloader/decorators';
import {
  AccountLoaderCreator,
  AgentLoaderCreator,
  ProfileLoaderCreator,
} from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { IVirtualContributor } from './virtual.contributor.interface';
import { IAccount } from '@domain/space/account/account.interface';
import { IAiPersona } from '../ai-persona';
import { IContributor } from '../contributor/contributor.interface';
import { VirtualContributorStatus } from '@common/enums/virtual.contributor.status.enum';

@Resolver(() => IVirtualContributor)
export class VirtualContributorResolverFields {
  constructor(
    private authorizationService: AuthorizationService,
    private virtualContributorService: VirtualContributorService
  ) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('account', () => IAccount, {
    nullable: true,
    description: 'The Account of the Virtual Contributor.',
  })
  @UseGuards(GraphqlGuard)
  async account(
    @Parent() virtualContributor: VirtualContributor,
    @Loader(AccountLoaderCreator, { parentClassRef: VirtualContributor })
    loader: ILoader<IAccount>
  ): Promise<IAccount | null> {
    let account: IAccount | never;
    try {
      account = await loader.load(virtualContributor.id);
    } catch (error) {
      return null;
    }
    return account;
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('authorization', () => IAuthorizationPolicy, {
    nullable: true,
    description: 'The Authorization for this Virtual.',
  })
  async authorization(
    @Parent() parent: VirtualContributor,
    @CurrentUser() agentInfo: AgentInfo
  ) {
    // Reload to ensure the authorization is loaded
    const virtual =
      await this.virtualContributorService.getVirtualContributorOrFail(
        parent.id
      );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      virtual.authorization,
      AuthorizationPrivilege.READ,
      `virtual authorization access: ${virtual.id}`
    );

    return virtual.authorization;
  }

  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The profile for this Virtual.',
  })
  @UseGuards(GraphqlGuard)
  async profile(
    @Parent() virtualContributor: VirtualContributor,
    @CurrentUser() agentInfo: AgentInfo,
    @Loader(ProfileLoaderCreator, { parentClassRef: VirtualContributor })
    loader: ILoader<IProfile>
  ) {
    const profile = await loader.load(virtualContributor.id);
    // Note: the Virtual profile is public.
    // Check if the user can read the profile entity, not the actual Virtual entity
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      profile.authorization,
      AuthorizationPrivilege.READ,
      `read profile on Virtual: ${profile.displayName}`
    );
    return profile;
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('agent', () => IAgent, {
    nullable: false,
    description: 'The Agent representing this User.',
  })
  async agent(
    @Parent() virtualContributor: VirtualContributor,
    @Loader(AgentLoaderCreator, { parentClassRef: VirtualContributor })
    loader: ILoader<IAgent>
  ): Promise<IAgent> {
    return loader.load(virtualContributor.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('aiPersona', () => IAiPersona, {
    nullable: true,
    description: 'The AI persona being used by this virtual contributor',
  })
  @UseGuards(GraphqlGuard)
  async aiPersona(
    @Parent() virtualContributor: VirtualContributor
  ): Promise<IAiPersona> {
    return this.virtualContributorService.getAiPersonaOrFail(
      virtualContributor
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('provider', () => IContributor, {
    nullable: false,
    description: 'The Virtual Contributor provider.',
  })
  async provider(
    @Parent() virtualContributor: IVirtualContributor
  ): Promise<IContributor> {
    return await this.virtualContributorService.getProvider(virtualContributor);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('status', () => VirtualContributorStatus, {
    nullable: false,
    description: 'The status of the virtual contributor',
  })
  async status(
    @Parent() virtualContributor: IVirtualContributor
  ): Promise<VirtualContributorStatus> {
    const lastUpdated =
      await this.virtualContributorService.getBodyOfKnowledgeLastUpdated(
        virtualContributor
      );

    if (!!lastUpdated) {
      return VirtualContributorStatus.READY;
    }
    return VirtualContributorStatus.INITIALIZING;
  }
}
