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
import { IngestSpaceInput } from '../space/dto/space.dto.ingest';
import { EventBus } from '@nestjs/cqrs';
import { IngestSpace } from '@services/infrastructure/event-bus/commands';
import { CommunityContributorType } from '@common/enums/community.contributor.type';
import { CommunityRole } from '@common/enums/community.role';

@Resolver()
export class AccountResolverMutations {
  constructor(
    private accountService: AccountService,
    private accountAuthorizationService: AccountAuthorizationService,
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private innovationFlowTemplateService: InnovationFlowTemplateService,
    private virtualContributorService: VirtualContributorService,
    private virtualContributorAuthorizationService: VirtualContributorAuthorizationService,
    private spaceDefaultsService: SpaceDefaultsService,
    private namingReporter: NameReporterService,
    private spaceService: SpaceService,
    private eventBus: EventBus
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
      `create space: ${accountData.spaceData?.nameID}`
    );
    let account = await this.accountService.createAccount(accountData);
    const rootSpace = await this.accountService.createSpaceOnAccount(
      account,
      accountData.spaceData,
      agentInfo
    );

    account = await this.accountAuthorizationService.applyAuthorizationPolicy(
      account
    );
    account = await this.accountService.save(account);

    await this.namingReporter.createOrUpdateName(
      rootSpace.id,
      rootSpace.profile.displayName
    );
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
          `deleteSpace + account: ${space.nameID}`
        );
        await this.accountService.deleteAccount(account);
        return space;
      case SpaceLevel.CHALLENGE:
      case SpaceLevel.OPPORTUNITY:
        this.authorizationService.grantAccessOrFail(
          agentInfo,
          space.authorization,
          AuthorizationPrivilege.DELETE,
          `deleteSpace: ${space.nameID}`
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
    return this.accountAuthorizationService
      .applyAuthorizationPolicy(account)
      .then(account => this.accountService.save(account));
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

    const result = await this.accountService.updateAccountPlatformSettings(
      updateData
    );

    // Update the authorization policy as most of the changes imply auth policy updates
    return this.accountAuthorizationService
      .applyAuthorizationPolicy(result)
      .then(account => this.accountService.save(account));
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
        `Unable to load defaults for space ${spaceDefaultsData.spaceID} `,
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
      `create Virtual contributor: ${virtualContributorData.nameID}`
    );

    let virtual = await this.accountService.createVirtualContributorOnAccount(
      virtualContributorData
    );

    virtual =
      await this.virtualContributorAuthorizationService.applyAuthorizationPolicy(
        virtual,
        account.authorization
      );

    virtual = await this.virtualContributorService.save(virtual);

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
  @Mutation(() => ISpace, {
    description: 'Triggers space ingestion.',
  })
  async ingestSpace(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ingestSpaceData')
    ingestSpaceData: IngestSpaceInput
  ): Promise<ISpace> {
    const space = await this.spaceService.getSpaceOrFail(
      ingestSpaceData.spaceID,
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

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      space.account.authorization,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `ingest space: ${space.nameID}(${space.id})`
    );

    this.eventBus.publish(new IngestSpace(space.id, ingestSpaceData.purpose));
    return space;
  }
}
