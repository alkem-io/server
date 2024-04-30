import { UseGuards } from '@nestjs/common';
import { Resolver, Args, Mutation } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { ISpace } from '../space/space.interface';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication/agent-info';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { NameReporterService } from '@services/external/elasticsearch/name-reporter/name.reporter.service';
import { AccountAuthorizationResetInput } from './dto/account.dto.reset.authorization';
import { AccountAuthorizationService } from './account.service.authorization';
import { AccountService } from './account.service';
import { IAccount } from './account.interface';
import { SpaceService } from '../space/space.service';
import { InnovationFlowTemplateService } from '@domain/template/innovation-flow-template/innovation.flow.template.service';
import { SpaceDefaultsService } from '../space.defaults/space.defaults.service';
import { UpdateSpaceDefaultsInput } from '../space/dto/space.dto.update.defaults';
import { ISpaceDefaults } from '../space.defaults/space.defaults.interface';
import { DeleteSpaceInput } from '../space/dto/space.dto.delete';
import { SpaceType } from '@common/enums/space.type';
import { UpdateAccountPlatformSettingsInput } from './dto/account.dto.update.platform.settings';
import { CreateAccountInput } from './dto';

@Resolver()
export class AccountResolverMutations {
  constructor(
    private accountService: AccountService,
    private accountAuthorizationService: AccountAuthorizationService,
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private innovationFlowTemplateService: InnovationFlowTemplateService,
    private spaceDefaultsService: SpaceDefaultsService,
    private namingReporter: NameReporterService,
    private spaceService: SpaceService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAccount, {
    description: 'Creates a new Account with a single root Space.',
  })
  async createAccount(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('accountData') accountData: CreateAccountInput
  ): Promise<IAccount> {
    const authorizationPolicy =
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy();
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorizationPolicy,
      AuthorizationPrivilege.CREATE_SPACE,
      `create space: ${accountData.spaceData?.nameID}`
    );
    const account = await this.accountService.createAccount(
      accountData,
      agentInfo
    );

    const accountUpdated =
      await this.accountAuthorizationService.applyAuthorizationPolicy(account);
    const space = await this.accountService.getRootSpace(accountUpdated);

    await this.namingReporter.createOrUpdateName(
      space.id,
      space.profile.displayName
    );
    return accountUpdated;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ISpace, {
    description: 'Deletes the specified Space.',
  })
  async deleteSpace(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteSpaceInput
  ): Promise<ISpace> {
    const space = await this.spaceService.getSpaceOrFail(deleteData.ID, {
      relations: {
        account: true,
      },
    });
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      space.authorization,
      AuthorizationPrivilege.DELETE,
      `deleteSpace: ${space.nameID}`
    );
    switch (space.type) {
      case SpaceType.SPACE:
        // delete via the account
        await this.accountService.deleteAccount(space.account);
        return space;
      case SpaceType.CHALLENGE:
      case SpaceType.OPPORTUNITY:
        return await this.spaceService.deleteSpace(deleteData);
    }
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAccount, {
    description: 'Reset the Authorization Policy on the specified Space.',
  })
  async authorizationPolicyResetOnAccount(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('authorizationResetData')
    authorizationResetData: AccountAuthorizationResetInput
  ): Promise<IAccount> {
    const account = await this.accountService.getAccountOrFail(
      authorizationResetData.accountID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      account.authorization,
      AuthorizationPrivilege.UPDATE, // todo: replace with AUTHORIZATION_RESET once that has been granted
      `reset authorization definition on Space: ${agentInfo.email}`
    );
    return await this.accountAuthorizationService.applyAuthorizationPolicy(
      account
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAccount, {
    description:
      'Update the platform settings, such as license, of the specified Account.',
  })
  async updateAccountPlatformSettings(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('updateData') updateData: UpdateAccountPlatformSettingsInput
  ): Promise<IAccount> {
    const account = await this.accountService.getAccountOrFail(
      updateData.accountID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      account.authorization,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `update platform settings on space: ${account.id}`
    );

    const result = await this.accountService.updateAccountPlatformSettings(
      updateData
    );

    // Update the authorization policy as most of the changes imply auth policy updates
    return await this.accountAuthorizationService.applyAuthorizationPolicy(
      result
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ISpaceDefaults, {
    description: 'Updates the specified SpaceDefaults.',
  })
  async updateSpaceDefaults(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('spaceDefaultsData')
    spaceDefaultsData: UpdateSpaceDefaultsInput
  ): Promise<ISpaceDefaults> {
    const space = await this.spaceService.getSpaceOrFail(
      spaceDefaultsData.spaceID,
      {
        relations: {
          account: true,
        },
      }
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      space.authorization,
      AuthorizationPrivilege.UPDATE,
      `update spaceDefaults: ${space.id}`
    );

    const spaceDefaults =
      await this.spaceDefaultsService.getSpaceDefaultsOrFail(
        spaceDefaultsData.spaceID
      );

    if (spaceDefaultsData.flowTemplateID) {
      const innovationFlowTemplate =
        await this.innovationFlowTemplateService.getInnovationFlowTemplateOrFail(
          spaceDefaultsData.flowTemplateID
        );
      return await this.spaceDefaultsService.updateSpaceDefaults(
        spaceDefaults,
        innovationFlowTemplate
      );
    }
    return spaceDefaults;
  }
}
