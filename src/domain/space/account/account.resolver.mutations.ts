import { UseGuards } from '@nestjs/common';
import { Resolver, Args, Mutation } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { ISpace } from '../space/space.interface';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
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
import { UpdateAccountPlatformSettingsInput } from './dto/account.dto.update.platform.settings';
import { CreateAccountInput } from './dto';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { LogContext } from '@common/enums/logging.context';
import { SpaceLevel } from '@common/enums/space.level';
import { EntityNotInitializedException } from '@common/exceptions';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { CreateVirtualContributorOnAccountInput } from './dto/account.dto.create.virtual.contributor';
import { VirtualContributorAuthorizationService } from '@domain/community/virtual-contributor/virtual.contributor.service.authorization';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { CommunityContributorType } from '@common/enums/community.contributor.type';
import { CommunityRole } from '@common/enums/community.role';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { NotificationInputSpaceCreated } from '@services/adapters/notification-adapter/dto/notification.dto.input.space.created';
import { CreateSpaceOnAccountInput } from './dto/account.dto.create.space';
import { CommunityService } from '@domain/community/community/community.service';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { CreateInnovationHubOnAccountInput } from './dto/account.dto.create.innovation.hub';
import { InnovationHubService } from '@domain/innovation-hub';
import { InnovationHubAuthorizationService } from '@domain/innovation-hub/innovation.hub.service.authorization';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { CreateInnovationPackOnAccountInput } from './dto/account.dto.create.innovation.pack';
import { InnovationPackAuthorizationService } from '@library/innovation-pack/innovation.pack.service.authorization';
import { InnovationPackService } from '@library/innovation-pack/innovaton.pack.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';

@Resolver()
export class AccountResolverMutations {
  constructor(
    private accountService: AccountService,
    private accountAuthorizationService: AccountAuthorizationService,
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private innovationFlowTemplateService: InnovationFlowTemplateService,
    private virtualContributorService: VirtualContributorService,
    private virtualContributorAuthorizationService: VirtualContributorAuthorizationService,
    private innovationHubService: InnovationHubService,
    private innovationHubAuthorizationService: InnovationHubAuthorizationService,
    private innovationPackService: InnovationPackService,
    private innovationPackAuthorizationService: InnovationPackAuthorizationService,
    private spaceDefaultsService: SpaceDefaultsService,
    private namingReporter: NameReporterService,
    private spaceService: SpaceService,
    private notificationAdapter: NotificationAdapter,
    private communityService: CommunityService
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
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorizationPolicy,
      AuthorizationPrivilege.CREATE_SPACE,
      `create account with hostID: ${accountData.hostID}`
    );
    let account = await this.accountService.createAccount(accountData);

    const createSpaceOnAccountData: CreateSpaceOnAccountInput = {
      accountID: account.id,
      spaceData: accountData.spaceData,
    };
    const accountWithStorageAggregator =
      await this.accountService.getAccountOrFail(account.id, {
        relations: {
          storageAggregator: true,
        },
      });
    account = await this.accountService.createSpaceOnAccount(
      accountWithStorageAggregator,
      createSpaceOnAccountData,
      agentInfo
    );
    account = await this.accountService.save(account);
    const updatedAuthorizations =
      await this.accountAuthorizationService.applyAuthorizationPolicy(account);
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    const rootSpace = await this.accountService.getRootSpace(account, {
      relations: {
        community: true,
      },
    });
    if (!rootSpace) {
      throw new EntityNotInitializedException(
        `Unable to load root space for account ${account.id}`,
        LogContext.ACCOUNT
      );
    }

    await this.namingReporter.createOrUpdateName(
      rootSpace.id,
      rootSpace.profile.displayName
    );

    if (!rootSpace.community?.id) {
      throw new RelationshipNotFoundException(
        `Unable to find community with id ${rootSpace.community?.id}`,
        LogContext.ACCOUNT
      );
    }
    const community = await this.communityService.getCommunityOrFail(
      rootSpace.community?.id,
      {
        relations: {
          parentCommunity: {
            authorization: true,
          },
        },
      }
    );
    const notificationInput: NotificationInputSpaceCreated = {
      triggeredBy: agentInfo.userID,
      community: community,
      account: account,
    };
    await this.notificationAdapter.spaceCreated(notificationInput);

    return account;
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
        account: {
          authorization: true,
        },
      },
    });

    switch (space.level) {
      case SpaceLevel.SPACE:
        // delete the account
        const account = space.account;
        this.authorizationService.grantAccessOrFail(
          agentInfo,
          account.authorization,
          AuthorizationPrivilege.DELETE,
          `deleteSpace + account: ${space.id}`
        );
        await this.accountService.deleteAccount(account);
        return space;
      case SpaceLevel.CHALLENGE:
      case SpaceLevel.OPPORTUNITY:
        this.authorizationService.grantAccessOrFail(
          agentInfo,
          space.authorization,
          AuthorizationPrivilege.DELETE,
          `deleteSpace: ${space.id}`
        );
        return await this.spaceService.deleteSpace(deleteData);
      default:
        throw new EntityNotInitializedException(
          `Invalid space level: ${space.id}`,
          LogContext.ACCOUNT
        );
    }
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAccount, {
    description: 'Reset the Authorization Policy on the specified Account.',
  })
  async authorizationPolicyResetOnAccount(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('authorizationResetData')
    authorizationResetData: AccountAuthorizationResetInput
  ): Promise<IAccount> {
    const account = await this.accountService.getAccountOrFail(
      authorizationResetData.accountID
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      account.authorization,
      AuthorizationPrivilege.AUTHORIZATION_RESET,
      `reset authorization definition on Space: ${agentInfo.email}`
    );

    const updatedAuthorizations =
      await this.accountAuthorizationService.applyAuthorizationPolicy(account);
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);
    return await this.accountService.getAccountOrFail(account.id);
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
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      account.authorization,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `update platform settings on space: ${account.id}`
    );

    const result =
      await this.accountService.updateAccountPlatformSettings(updateData);

    await this.accountService.save(result);

    // Update the authorization policy as most of the changes imply auth policy updates
    const updatedAuthorizations =
      await this.accountAuthorizationService.applyAuthorizationPolicy(result);
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    return await this.accountService.getAccountOrFail(account.id);
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
          account: {
            defaults: {
              authorization: true,
            },
          },
        },
      }
    );
    const spaceDefaults = space.account.defaults;
    if (!spaceDefaults) {
      throw new RelationshipNotFoundException(
        `Unable to load defaults for space ${spaceDefaultsData.spaceID}`,
        LogContext.ACCOUNT
      );
    }
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      spaceDefaults.authorization,
      AuthorizationPrivilege.UPDATE,
      `update spaceDefaults: ${space.id}`
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

  @UseGuards(GraphqlGuard)
  @Mutation(() => IInnovationHub, {
    description: 'Create Innovation Hub.',
  })
  async createInnovationHub(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('createData') createData: CreateInnovationHubOnAccountInput
  ): Promise<IInnovationHub> {
    // InnovationHubs still require platform admin for now
    const authorizationPolicy =
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy();
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorizationPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'create innovation space'
    );
    const account = await this.accountService.getAccountOrFail(
      createData.accountID,
      {
        relations: {
          storageAggregator: true,
        },
      }
    );

    let innovationHub = await this.innovationHubService.createInnovationHub(
      createData,
      account
    );
    innovationHub =
      await this.innovationHubAuthorizationService.applyAuthorizationPolicyAndSave(
        innovationHub,
        account.authorization
      );
    return await this.innovationHubService.save(innovationHub);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IVirtualContributor, {
    description: 'Creates a new VirtualContributor on an Account.',
  })
  async createVirtualContributor(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('virtualContributorData')
    virtualContributorData: CreateVirtualContributorOnAccountInput
  ): Promise<IVirtualContributor> {
    const account = await this.accountService.getAccountOrFail(
      virtualContributorData.accountID,
      {
        relations: {
          space: {
            community: true,
          },
        },
      }
    );
    if (!account.space || !account.space.community) {
      throw new EntityNotInitializedException(
        `Account space or community is not initialized: ${account.id}`,
        LogContext.ACCOUNT
      );
    }

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      account.authorization,
      AuthorizationPrivilege.CREATE_VIRTUAL_CONTRIBUTOR,
      `create Virtual contributor on account: ${account.id}`
    );

    const virtual = await this.accountService.createVirtualContributorOnAccount(
      virtualContributorData
    );

    const clonedAccountAuth =
      await this.accountAuthorizationService.getClonedAccountAuthExtendedForChildEntities(
        account
      );

    const updatedAuthorizations =
      await this.virtualContributorAuthorizationService.applyAuthorizationPolicy(
        virtual,
        clonedAccountAuth
      );
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    // VC is created, now assign the contributor to the Member role on root space
    await this.spaceService.assignContributorToRole(
      account.space,
      virtual,
      CommunityRole.MEMBER,
      CommunityContributorType.VIRTUAL
    );

    // Reload to ensure the new member credential is loaded
    return await this.virtualContributorService.getVirtualContributorOrFail(
      virtual.id
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IInnovationPack, {
    description: 'Creates a new InnovationPack on an Account.',
  })
  async createInnovationPack(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('innovationPackData')
    innovationPackData: CreateInnovationPackOnAccountInput
  ): Promise<IInnovationPack> {
    const account = await this.accountService.getAccountOrFail(
      innovationPackData.accountID,
      {
        relations: {
          space: {
            community: true,
          },
        },
      }
    );
    if (!account.space || !account.space.community) {
      throw new EntityNotInitializedException(
        `Account space or community is not initialized: ${account.id}`,
        LogContext.ACCOUNT
      );
    }

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      account.authorization,
      AuthorizationPrivilege.CREATE,
      `create Innovation Pack on account: ${account.id}`
    );

    const innovationPack =
      await this.accountService.createInnovationPackOnAccount(
        innovationPackData
      );

    const clonedAccountAuth =
      await this.accountAuthorizationService.getClonedAccountAuthExtendedForChildEntities(
        account
      );
    const updatedAuthorizations =
      await this.innovationPackAuthorizationService.applyAuthorizationPolicy(
        innovationPack,
        clonedAccountAuth
      );
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    return await this.innovationPackService.getInnovationPackOrFail(
      innovationPack.id
    );
  }
}
