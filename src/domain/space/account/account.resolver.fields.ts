import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { Account } from '@domain/space/account/account.entity';
import { IOrganization } from '@domain/community/organization';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege } from '@src/common/decorators';
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
} from '@core/dataloader/creators/loader.creators';

@Resolver(() => IAccount)
export class AccountResolverFields {
  constructor(private accountService: AccountService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('library', () => ITemplatesSet, {
    nullable: true,
    description: 'The Library in use by this Account',
  })
  @UseGuards(GraphqlGuard)
  async library(
    @Parent() account: Account,
    @Loader(AccountLibraryLoaderCreator) loader: ILoader<ITemplatesSet>
  ): Promise<ITemplatesSet> {
    return loader.load(account.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('defaults', () => ISpaceDefaults, {
    nullable: true,
    description: 'The defaults in use by this Account',
  })
  @UseGuards(GraphqlGuard)
  async defaults(
    @Parent() account: Account,
    @Loader(AccountDefaultsLoaderCreator) loader: ILoader<ISpaceDefaults>
  ): Promise<ISpaceDefaults> {
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

  @ResolveField('host', () => IOrganization, {
    nullable: true,
    description: 'The Account host.',
  })
  async host(@Parent() account: Account): Promise<IOrganization | undefined> {
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
}
