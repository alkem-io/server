import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { Account } from '@domain/space/account/account.entity';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthorizationAgentPrivilege,
  CurrentUser,
  Profiling,
} from '@src/common/decorators';
import { AccountService } from '@domain/space/account/account.service';
import { IAccount } from '@domain/space/account/account.interface';
import { ITemplatesSet } from '@domain/template/templates-set';
import { Loader } from '@core/dataloader/decorators';
import { ILoader } from '@core/dataloader/loader.interface';
import { ILicense } from '@domain/license/license/license.interface';
import { ISpaceDefaults } from '../space.defaults/space.defaults.interface';
import {
  AccountDefaultsLoaderCreator,
  AccountLicenseLoaderCreator,
  AccountLibraryLoaderCreator,
  AuthorizationLoaderCreator,
  AgentLoaderCreator,
} from '@core/dataloader/creators/loader.creators';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { IContributor } from '@domain/community/contributor/contributor.interface';

@Resolver(() => IAccount)
export class AccountResolverFields {
  constructor(
    private accountService: AccountService,
    private authorizationService: AuthorizationService
  ) {}

  @ResolveField('library', () => ITemplatesSet, {
    nullable: true,
    description: 'The Library in use by this Account',
  })
  @UseGuards(GraphqlGuard)
  async library(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() account: Account,
    @Loader(AccountLibraryLoaderCreator) loader: ILoader<ITemplatesSet>
  ): Promise<ITemplatesSet> {
    const accountWithAuth = await this.accountService.getAccountOrFail(
      account.id
    );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      accountWithAuth.authorization,
      AuthorizationPrivilege.READ,
      `read defaults on library: ${account.id}`
    );

    return loader.load(account.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('agent', () => IAgent, {
    nullable: false,
    description: 'The Agent representing this Account.',
  })
  async agent(
    @Parent() account: Account,
    @Loader(AgentLoaderCreator, { parentClassRef: Account })
    loader: ILoader<IAgent>
  ): Promise<IAgent> {
    return loader.load(account.id);
  }

  @ResolveField('defaults', () => ISpaceDefaults, {
    nullable: true,
    description: 'The defaults in use by this Account',
  })
  @UseGuards(GraphqlGuard)
  async defaults(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() account: Account,
    @Loader(AccountDefaultsLoaderCreator) loader: ILoader<ISpaceDefaults>
  ): Promise<ISpaceDefaults> {
    const accountWithAuth = await this.accountService.getAccountOrFail(
      account.id
    );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      accountWithAuth.authorization,
      AuthorizationPrivilege.READ,
      `read defaults on account: ${account.id}`
    );
    return loader.load(account.id);
  }

  @ResolveField('license', () => ILicense, {
    nullable: false,
    description:
      'The License governing platform functionality in use by this Account',
  })
  async license(
    @Parent() account: Account,
    @Loader(AccountLicenseLoaderCreator) loader: ILoader<ILicense>
  ): Promise<ILicense> {
    return loader.load(account.id);
  }

  @ResolveField('host', () => IContributor, {
    nullable: true,
    description: 'The Account host.',
  })
  async host(@Parent() account: Account): Promise<IContributor> {
    return await this.accountService.getHost(account);
  }

  @ResolveField('spaceID', () => String, {
    nullable: false,
    description: 'The ID for the root space for the Account .',
  })
  async spaceID(@Parent() account: Account): Promise<string> {
    const space = await this.accountService.getRootSpace(account);
    return space.id;
  }

  @ResolveField('authorization', () => IAuthorizationPolicy, {
    nullable: false,
    description: 'The Authorization for this Account.',
  })
  @Profiling.api
  async authorization(
    @Parent() account: Account,
    @Loader(AuthorizationLoaderCreator, { parentClassRef: Account })
    loader: ILoader<IAuthorizationPolicy>
  ) {
    return loader.load(account.id);
  }
}
