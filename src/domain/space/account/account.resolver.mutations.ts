import { UseGuards } from '@nestjs/common';
import { Resolver, Args, Mutation } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
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

@Resolver()
export class AccountResolverMutations {
  constructor(
    private accountService: AccountService,
    private accountAuthorizationService: AccountAuthorizationService,
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
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

    space =
      await this.spaceAuthorizationService.applyAuthorizationPolicy(space);

    space = await this.spaceService.save(space);

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
      account: account,
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
      virtualContributorData.accountID
    );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      account.authorization,
      AuthorizationPrivilege.CREATE_VIRTUAL_CONTRIBUTOR,
      `create Virtual contributor on account: ${account.id}`
    );

    let virtual = await this.accountService.createVirtualContributorOnAccount(
      virtualContributorData
    );

    const clonedAccountAuth =
      await this.accountAuthorizationService.getClonedAccountAuthExtendedForChildEntities(
        account
      );

    // Need
    virtual =
      await this.virtualContributorAuthorizationService.applyAuthorizationPolicy(
        virtual,
        clonedAccountAuth
      );

    virtual = await this.virtualContributorService.save(virtual);

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

    let innovationPack =
      await this.accountService.createInnovationPackOnAccount(
        innovationPackData
      );

    const clonedAccountAuth =
      await this.accountAuthorizationService.getClonedAccountAuthExtendedForChildEntities(
        account
      );

    innovationPack =
      await this.innovationPackAuthorizationService.applyAuthorizationPolicy(
        innovationPack,
        clonedAccountAuth
      );

    return await this.innovationPackService.save(innovationPack);
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
}
