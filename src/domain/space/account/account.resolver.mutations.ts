import { UseGuards } from '@nestjs/common';
import { Resolver, Args, Mutation } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { NameReporterService } from '@services/external/elasticsearch/name-reporter/name.reporter.service';
import { AccountAuthorizationResetInput } from './dto/account.dto.reset.authorization';
import { AccountAuthorizationService } from './account.service.authorization';
import { AccountService } from './account.service';
import { IAccount } from './account.interface';
import { SpaceService } from '../space/space.service';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { CreateVirtualContributorOnAccountInput } from './dto/account.dto.create.virtual.contributor';
import { VirtualContributorAuthorizationService } from '@domain/community/virtual-contributor/virtual.contributor.service.authorization';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { NotificationInputSpaceCreated } from '@services/adapters/notification-adapter/dto/notification.dto.input.space.created';
import { CreateSpaceOnAccountInput } from './dto/account.dto.create.space';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { CreateInnovationHubOnAccountInput } from './dto/account.dto.create.innovation.hub';
import { InnovationHubService } from '@domain/innovation-hub/innovation.hub.service';
import { InnovationHubAuthorizationService } from '@domain/innovation-hub/innovation.hub.service.authorization';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { CreateInnovationPackOnAccountInput } from './dto/account.dto.create.innovation.pack';
import { InnovationPackAuthorizationService } from '@library/innovation-pack/innovation.pack.service.authorization';
import { InnovationPackService } from '@library/innovation-pack/innovaton.pack.service';
import { SpaceAuthorizationService } from '../space/space.service.authorization';
import { ISpace } from '../space/space.interface';
import { RelationshipNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { TransferAccountSpaceInput } from './dto/account.dto.transfer.space';
import { TransferAccountInnovationHubInput } from './dto/account.dto.transfer.innovation.hub';
import { TransferAccountInnovationPackInput } from './dto/account.dto.transfer.innovation.pack';
import { TransferAccountVirtualContributorInput } from './dto/account.dto.transfer.virtual.contributor';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';

@Resolver()
export class AccountResolverMutations {
  constructor(
    private accountService: AccountService,
    private accountAuthorizationService: AccountAuthorizationService,
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private virtualContributorService: VirtualContributorService,
    private virtualContributorAuthorizationService: VirtualContributorAuthorizationService,
    private innovationHubService: InnovationHubService,
    private innovationHubAuthorizationService: InnovationHubAuthorizationService,
    private innovationPackService: InnovationPackService,
    private innovationPackAuthorizationService: InnovationPackAuthorizationService,
    private namingReporter: NameReporterService,
    private spaceService: SpaceService,
    private spaceAuthorizationService: SpaceAuthorizationService,
    private notificationAdapter: NotificationAdapter
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAccount, {
    description: 'Creates a new Level Zero Space within the specified Account.',
  })
  async createSpace(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('spaceData') spaceData: CreateSpaceOnAccountInput
  ): Promise<ISpace> {
    const account = await this.accountService.getAccountOrFail(
      spaceData.accountID,
      {
        relations: {},
      }
    );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      account.authorization,
      AuthorizationPrivilege.CREATE_SPACE,
      `create Space on account: ${spaceData.nameID}`
    );

    let space = await this.accountService.createSpaceOnAccount(spaceData);
    space = await this.spaceService.save(space);

    const spaceAuthorizations =
      await this.spaceAuthorizationService.applyAuthorizationPolicy(space);
    await this.authorizationPolicyService.saveAll(spaceAuthorizations);

    space = await this.spaceService.getSpaceOrFail(space.id, {
      relations: {
        profile: true,
        community: true,
      },
    });
    if (!space.profile || !space.community) {
      throw new RelationshipNotFoundException(
        `Unable to load space profile or community: ${space.id}`,
        LogContext.ACCOUNT
      );
    }

    await this.namingReporter.createOrUpdateName(
      space.id,
      space.profile.displayName
    );

    const notificationInput: NotificationInputSpaceCreated = {
      triggeredBy: agentInfo.userID,
      community: space.community,
    };
    await this.notificationAdapter.spaceCreated(notificationInput);

    return space;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IInnovationHub, {
    description: 'Create an Innovation Hub on the specified account',
  })
  async createInnovationHub(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('createData') createData: CreateInnovationHubOnAccountInput
  ): Promise<IInnovationHub> {
    const account = await this.accountService.getAccountOrFail(
      createData.accountID,
      {
        relations: {
          storageAggregator: true,
        },
      }
    );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      account.authorization,
      AuthorizationPrivilege.CREATE_INNOVATION_HUB,
      `create InnovationHub on account: ${account.id}`
    );

    let innovationHub = await this.innovationHubService.createInnovationHub(
      createData,
      account
    );
    innovationHub = await this.innovationHubService.save(innovationHub);
    const authorizations =
      await this.innovationHubAuthorizationService.applyAuthorizationPolicy(
        innovationHub,
        account.authorization
      );
    await this.authorizationPolicyService.saveAll(authorizations);
    return await this.innovationHubService.getInnovationHubOrFail(
      innovationHub.id
    );
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
      virtualContributorData.accountID
    );

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
        relations: {},
      }
    );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      account.authorization,
      AuthorizationPrivilege.CREATE_INNOVATION_PACK,
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
    const accountAuthorizations =
      await this.accountAuthorizationService.applyAuthorizationPolicy(account);
    await this.authorizationPolicyService.saveAll(accountAuthorizations);
    return await this.accountService.getAccountOrFail(account.id);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IInnovationHub, {
    description: 'Transfer the specified InnovationHub to another Account.',
  })
  async transferInnovationHubToAccount(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('transferData') transferData: TransferAccountInnovationHubInput
  ): Promise<IInnovationHub> {
    let innovationHub = await this.innovationHubService.getInnovationHubOrFail(
      transferData.innovationHubID,
      {
        relations: {
          account: {
            authorization: true,
          },
        },
      }
    );
    const targetAccount = await this.accountService.getAccountOrFail(
      transferData.targetAccountID
    );

    await this.validateTransferOfAccountResource(
      innovationHub.account,
      targetAccount,
      agentInfo,
      'InnovationHub',
      transferData.innovationHubID
    );

    innovationHub.account = targetAccount;
    // TODO: check if still needed later
    innovationHub = await this.innovationHubService.save(innovationHub);
    const clonedAccountAuth =
      await this.accountAuthorizationService.getClonedAccountAuthExtendedForChildEntities(
        targetAccount
      );

    const innovationHubAuthorizations =
      await this.innovationHubAuthorizationService.applyAuthorizationPolicy(
        innovationHub,
        clonedAccountAuth
      );
    await this.authorizationPolicyService.saveAll(innovationHubAuthorizations);

    // TODO: check if still needed later
    return await this.innovationHubService.getInnovationHubOrFail(
      innovationHub.id
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ISpace, {
    description: 'Transfer the specified Space to another Account.',
  })
  async transferSpaceToAccount(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('transferData') transferData: TransferAccountSpaceInput
  ): Promise<ISpace> {
    let space = await this.spaceService.getSpaceOrFail(transferData.spaceID, {
      relations: {
        account: {
          authorization: true,
        },
      },
    });
    const targetAccount = await this.accountService.getAccountOrFail(
      transferData.targetAccountID
    );

    await this.validateTransferOfAccountResource(
      space.account,
      targetAccount,
      agentInfo,
      'Space',
      transferData.spaceID
    );

    space.account = targetAccount;

    space = await this.spaceService.save(space);

    const spaceAuthorizations =
      await this.spaceAuthorizationService.applyAuthorizationPolicy(space);
    await this.authorizationPolicyService.saveAll(spaceAuthorizations);
    // TODO: check if still needed later
    return await this.spaceService.getSpaceOrFail(space.id);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IInnovationPack, {
    description: 'Transfer the specified Innovation Pack to another Account.',
  })
  async transferInnovationPackToAccount(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('transferData') transferData: TransferAccountInnovationPackInput
  ): Promise<IInnovationPack> {
    let innovationPack =
      await this.innovationPackService.getInnovationPackOrFail(
        transferData.innovationPackID,
        {
          relations: {
            account: {
              authorization: true,
            },
          },
        }
      );
    const targetAccount = await this.accountService.getAccountOrFail(
      transferData.targetAccountID
    );

    await this.validateTransferOfAccountResource(
      innovationPack.account,
      targetAccount,
      agentInfo,
      'Innovation Pack',
      transferData.innovationPackID
    );

    innovationPack.account = targetAccount;
    innovationPack = await this.innovationPackService.save(innovationPack);

    const clonedAccountAuth =
      await this.accountAuthorizationService.getClonedAccountAuthExtendedForChildEntities(
        targetAccount
      );
    const innovationPackAuthorizations =
      await this.innovationPackAuthorizationService.applyAuthorizationPolicy(
        innovationPack,
        clonedAccountAuth
      );
    await this.authorizationPolicyService.saveAll(innovationPackAuthorizations);

    return await this.innovationPackService.getInnovationPackOrFail(
      innovationPack.id
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IInnovationPack, {
    description:
      'Transfer the specified Virtual Contributor to another Account.',
  })
  async transferVirtualContributorToAccount(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('transferData') transferData: TransferAccountVirtualContributorInput
  ): Promise<IVirtualContributor> {
    let virtualContributor =
      await this.virtualContributorService.getVirtualContributorOrFail(
        transferData.virtualContributorID,
        {
          relations: {
            account: {
              authorization: true,
            },
          },
        }
      );
    const targetAccount = await this.accountService.getAccountOrFail(
      transferData.targetAccountID
    );

    await this.validateTransferOfAccountResource(
      virtualContributor.account,
      targetAccount,
      agentInfo,
      'VirtualContributor',
      transferData.virtualContributorID
    );

    virtualContributor.account = targetAccount;
    // TODO: check if still needed later
    virtualContributor =
      await this.virtualContributorService.save(virtualContributor);

    const clonedAccountAuth =
      await this.accountAuthorizationService.getClonedAccountAuthExtendedForChildEntities(
        targetAccount
      );
    const virtualContributorAuthorizations =
      await this.virtualContributorAuthorizationService.applyAuthorizationPolicy(
        virtualContributor,
        clonedAccountAuth
      );
    await this.authorizationPolicyService.saveAll(
      virtualContributorAuthorizations
    );

    // TODO: check if still needed later
    return await this.virtualContributorService.getVirtualContributorOrFail(
      virtualContributor.id
    );
  }

  private async validateTransferOfAccountResource(
    currentAccount: IAccount | undefined,
    targetAccount: IAccount,
    agentInfo: AgentInfo,
    resourceName: string,
    resourceID: string
  ): Promise<void> {
    if (!currentAccount) {
      throw new RelationshipNotFoundException(
        `Unable to find Account on ${resourceName}: ${resourceID}`,
        LogContext.ACCOUNT
      );
    }

    // Double authorization check: on Account where InnovationHub is, and where it it being transferred to
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      currentAccount.authorization,
      AuthorizationPrivilege.TRANSFER_RESOURCE,
      `transfer ${resourceName} to another Account: ${agentInfo.email}`
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      targetAccount.authorization,
      AuthorizationPrivilege.CREATE,
      `transfer ${resourceName} to target Account: ${agentInfo.email}`
    );
  }
}
