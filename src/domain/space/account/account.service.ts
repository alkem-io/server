import { AuthorizationCredential, LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  NotSupportedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, FindOneOptions, Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Account } from './account.entity';
import { IAccount } from './account.interface';
import { AgentService } from '@domain/agent/agent/agent.service';
import { ITemplatesSet } from '@domain/template/templates-set/templates.set.interface';
import { TemplatesSetService } from '@domain/template/templates-set/templates.set.service';
import { SpaceDefaultsService } from '../space.defaults/space.defaults.service';
import { UpdateAccountDefaultsInput } from './dto/account.dto.update.defaults';
import { ISpaceDefaults } from '../space.defaults/space.defaults.interface';
import { SpaceService } from '../space/space.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { ISpace } from '../space/space.interface';
import { UpdateAccountPlatformSettingsInput } from './dto/account.dto.update.platform.settings';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { CreateAccountInput } from './dto/account.dto.create';
import { LicensingService } from '@platform/licensing/licensing.service';
import { ILicensePlan } from '@platform/license-plan/license.plan.interface';
import { IAccountSubscription } from './account.license.subscription.interface';
import { LicenseCredential } from '@common/enums/license.credential';
import { CreateVirtualContributorOnAccountInput } from './dto/account.dto.create.virtual.contributor';
import { IVirtualContributor } from '@domain/community/virtual-contributor';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { User } from '@domain/community/user';
import { LicenseIssuerService } from '@platform/license-issuer/license.issuer.service';
import { AccountHostService } from '../account.host/account.host.service';
import { Organization } from '@domain/community/organization/organization.entity';
import { LicensePrivilege } from '@common/enums/license.privilege';
import { LicenseEngineService } from '@core/license-engine/license.engine.service';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { CreateSpaceOnAccountInput } from './dto/account.dto.create.space';
import { Space } from '../space/space.entity';
import { LicensePlanType } from '@common/enums/license.plan.type';
import { CreateInnovationHubOnAccountInput } from './dto/account.dto.create.innovation.hub';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { InnovationHubService } from '@domain/innovation-hub';
import { SpaceLevel } from '@common/enums/space.level';
import { InnovationPackService } from '@library/innovation-pack/innovaton.pack.service';
import { CreateInnovationPackOnAccountInput } from './dto/account.dto.create.innovation.pack';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { AgentType } from '@common/enums/agent.type';

@Injectable()
export class AccountService {
  constructor(
    private accountHostService: AccountHostService,
    private spaceService: SpaceService,
    private agentService: AgentService,
    private templatesSetService: TemplatesSetService,
    private spaceDefaultsService: SpaceDefaultsService,
    private licensingService: LicensingService,
    private licenseEngineService: LicenseEngineService,
    private licenseIssuerService: LicenseIssuerService,
    private storageAggregatorService: StorageAggregatorService,
    private virtualContributorService: VirtualContributorService,
    private innovationHubService: InnovationHubService,
    private innovationPackService: InnovationPackService,
    private namingService: NamingService,
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createAccount(accountData: CreateAccountInput): Promise<IAccount> {
    const licensingFramework =
      await this.licensingService.getDefaultLicensingOrFail();

    let account: IAccount = new Account();
    account.authorization = new AuthorizationPolicy();
    account.storageAggregator =
      await this.storageAggregatorService.createStorageAggregator(
        StorageAggregatorType.ACCOUNT
      );
    account.library = await this.templatesSetService.createTemplatesSet();
    account.defaults = await this.spaceDefaultsService.createSpaceDefaults();

    // And set the defaults
    account.library =
      await this.spaceDefaultsService.addDefaultTemplatesToSpaceLibrary(
        account.library,
        account.storageAggregator
      );
    if (
      account.defaults &&
      account.library &&
      account.library.innovationFlowTemplates.length !== 0
    ) {
      account.defaults.innovationFlowTemplate =
        account.library.innovationFlowTemplates[0];
    }

    account.agent = await this.agentService.createAgent({
      type: AgentType.ACCOUNT,
    });

    const host = await this.accountHostService.getHostByID(accountData.hostID);

    const licensePlansToAssign: ILicensePlan[] = [];
    const licensePlans = await this.licensingService.getLicensePlans(
      licensingFramework.id
    );
    for (const plan of licensePlans) {
      if (host instanceof User && plan.assignToNewUserAccounts) {
        licensePlansToAssign.push(plan);
      } else if (
        host instanceof Organization &&
        plan.assignToNewOrganizationAccounts
      ) {
        licensePlansToAssign.push(plan);
      }
    }

    const accountAgent = account.agent;
    account = await this.save(account);

    for (const licensePlan of licensePlansToAssign) {
      account.agent = await this.licenseIssuerService.assignLicensePlan(
        accountAgent,
        licensePlan,
        account.id
      );
    }

    await this.accountHostService.setAccountHost(account, accountData.hostID);

    return account;
  }

  async createSpaceOnAccount(
    account: IAccount,
    spaceOnAccountData: CreateSpaceOnAccountInput,
    agentInfo?: AgentInfo
  ): Promise<IAccount> {
    if (!account.storageAggregator) {
      throw new RelationshipNotFoundException(
        `Unable to find storage aggregator on account for creating space ${account.id} `,
        LogContext.ACCOUNT
      );
    }
    const spaceData = spaceOnAccountData.spaceData;

    const reservedNameIDs =
      await this.namingService.getReservedNameIDsLevelZeroSpaces();
    if (!spaceData.nameID) {
      spaceData.nameID = this.namingService.createNameIdAvoidingReservedNameIDs(
        spaceData.profileData.displayName,
        reservedNameIDs
      );
    } else {
      if (reservedNameIDs.includes(spaceData.nameID)) {
        throw new ValidationException(
          `Unable to create entity: the provided nameID is already taken: ${spaceData.nameID}`,
          LogContext.SPACES
        );
      }
    }

    // Set data for the root space
    spaceData.level = SpaceLevel.SPACE;
    spaceData.storageAggregatorParent = account.storageAggregator;

    account.space = await this.spaceService.createSpace(
      spaceData,
      account,
      agentInfo
    );
    const savedAccount = await this.save(account);

    await this.spaceService.assignUserToRoles(account.space, agentInfo);
    return savedAccount;
  }

  async save(account: IAccount): Promise<IAccount> {
    return await this.accountRepository.save(account);
  }

  public async updateAccountDefaults(
    accountDefaultsData: UpdateAccountDefaultsInput
  ): Promise<ISpaceDefaults> {
    const account = await this.getAccountOrFail(accountDefaultsData.accountID, {
      relations: {
        defaults: true,
        library: {
          innovationFlowTemplates: true,
        },
      },
    });
    if (
      !account.defaults ||
      !account.library ||
      !account.library.innovationFlowTemplates
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load all required data to update the defaults on  Account ${account.id} `,
        LogContext.ACCOUNT
      );
    }

    // Verify that the specified template is in the account library
    const template = account.library.innovationFlowTemplates.find(
      t => t.id === accountDefaultsData.flowTemplateID
    );
    if (!template) {
      throw new NotSupportedException(
        `InnovationFlowTemplate ID provided (${accountDefaultsData.flowTemplateID}) is not part of the Library for the Account ${account.id} `,
        LogContext.ACCOUNT
      );
    }

    return await this.spaceDefaultsService.updateSpaceDefaults(
      account.defaults,
      template
    );
  }

  public async updateAccountPlatformSettings(
    updateData: UpdateAccountPlatformSettingsInput
  ): Promise<IAccount> {
    const account = await this.getAccountOrFail(updateData.accountID, {
      relations: {},
    });

    if (updateData.hostID) {
      await this.accountHostService.setAccountHost(account, updateData.hostID);
    }

    return await this.save(account);
  }

  async deleteAccount(accountInput: IAccount): Promise<IAccount> {
    const accountID = accountInput.id;
    const account = await this.getAccountOrFail(accountID, {
      relations: {
        agent: true,
        space: true,
        library: true,
        defaults: true,
        virtualContributors: true,
        innovationPacks: true,
        storageAggregator: true,
        innovationHubs: true,
      },
    });

    if (
      !account.agent ||
      !account.space ||
      !account.defaults ||
      !account.library ||
      !account.virtualContributors ||
      !account.storageAggregator ||
      !account.innovationHubs ||
      !account.innovationPacks
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load all entities for deletion of account ${account.id} `,
        LogContext.ACCOUNT
      );
    }

    const host = await this.accountHostService.getHostOrFail(account);
    await this.spaceService.deleteSpace({
      ID: account.space.id,
    });

    await this.agentService.deleteAgent(account.agent.id);

    await this.templatesSetService.deleteTemplatesSet(account.library.id);

    await this.spaceDefaultsService.deleteSpaceDefaults(account.defaults.id);
    await this.storageAggregatorService.delete(account.storageAggregator.id);

    // Remove the account host credential
    host.agent = await this.agentService.revokeCredential({
      agentID: host.agent.id,
      type: AuthorizationCredential.ACCOUNT_HOST,
      resourceID: account.id,
    });
    for (const vc of account.virtualContributors) {
      await this.virtualContributorService.deleteVirtualContributor(vc.id);
    }
    for (const ip of account.innovationPacks) {
      await this.innovationPackService.deleteInnovationPack({ ID: ip.id });
    }

    for (const hub of account.innovationHubs) {
      await this.innovationHubService.delete(hub.id);
    }

    const result = await this.accountRepository.remove(account as Account);
    result.id = accountID;
    return result;
  }

  async getAccountOrFail(
    accountID: string,
    options?: FindOneOptions<Account>
  ): Promise<IAccount | never> {
    const account = await this.getAccount(accountID, options);
    if (!account)
      throw new EntityNotFoundException(
        `Unable to find Account with ID: ${accountID}`,
        LogContext.ACCOUNT
      );
    return account;
  }

  async getAccount(
    accountID: string,
    options?: FindOneOptions<Account>
  ): Promise<IAccount | null> {
    let account: IAccount | null = null;
    account = await this.accountRepository.findOne({
      where: { id: accountID },
      ...options,
    });

    return account;
  }
  async getAccounts(options?: FindManyOptions<Account>): Promise<IAccount[]> {
    const accounts = await this.accountRepository.find({
      ...options,
    });

    if (accounts.length === 0) return [];

    return accounts;
  }
  async getLicensePrivileges(account: IAccount): Promise<LicensePrivilege[]> {
    let accountAgent = account.agent;
    if (!account.agent) {
      const accountWithAgent = await this.getAccountOrFail(account.id, {
        relations: {
          agent: {
            credentials: true,
          },
        },
      });
      accountAgent = accountWithAgent.agent;
    }
    if (!accountAgent) {
      throw new EntityNotFoundException(
        `Unable to find agent with credentials for account: ${account.id}`,
        LogContext.ACCOUNT
      );
    }
    const privileges =
      await this.licenseEngineService.getGrantedPrivileges(accountAgent);
    return privileges;
  }

  async getLibraryOrFail(accountId: string): Promise<ITemplatesSet> {
    const accountWithTemplates = await this.getAccountOrFail(accountId, {
      relations: {
        library: {
          postTemplates: true,
        },
      },
    });
    const templatesSet = accountWithTemplates.library;

    if (!templatesSet) {
      throw new EntityNotFoundException(
        `Unable to find templatesSet for account with id: ${accountId}`,
        LogContext.ACCOUNT
      );
    }

    return templatesSet;
  }

  async getRootSpace(
    accountInput: IAccount,
    options?: FindOneOptions<Space>
  ): Promise<ISpace | undefined> {
    if (accountInput.space && accountInput.space.profile) {
      return accountInput.space;
    }
    const account = await this.getAccountOrFail(accountInput.id, {
      relations: {
        space: {
          profile: true,
          ...options?.relations,
        },
      },
    });
    return account.space;
  }

  async getSubscriptions(
    accountInput: IAccount
  ): Promise<IAccountSubscription[]> {
    const account = await this.getAccountOrFail(accountInput.id, {
      relations: {
        agent: {
          credentials: true,
        },
      },
    });
    if (!account.agent || !account.agent.credentials) {
      throw new EntityNotFoundException(
        `Unable to find agent with credentials for account: ${accountInput.id}`,
        LogContext.ACCOUNT
      );
    }
    const subscriptions: IAccountSubscription[] = [];
    for (const credential of account.agent.credentials) {
      if (
        Object.values(LicenseCredential).includes(
          credential.type as LicenseCredential
        )
      ) {
        subscriptions.push({
          name: credential.type as LicenseCredential,
          expires: credential.expires,
        });
      }
    }
    return subscriptions;
  }

  public async createVirtualContributorOnAccount(
    vcData: CreateVirtualContributorOnAccountInput
  ): Promise<IVirtualContributor> {
    const accountID = vcData.accountID;
    const account = await this.getAccountOrFail(accountID, {
      relations: {
        virtualContributors: true,
        storageAggregator: true,
      },
    });

    if (!account.virtualContributors || !account.storageAggregator) {
      throw new RelationshipNotFoundException(
        `Unable to load Account with required entities for creating VC: ${account.id} `,
        LogContext.ACCOUNT
      );
    }

    const vc = await this.virtualContributorService.createVirtualContributor(
      vcData,
      account.storageAggregator
    );
    vc.account = account;
    return await this.virtualContributorService.save(vc);
  }

  public async createInnovationHubOnAccount(
    innovationHubData: CreateInnovationHubOnAccountInput
  ): Promise<IInnovationHub> {
    const accountID = innovationHubData.accountID;
    const account = await this.getAccountOrFail(accountID, {
      relations: { storageAggregator: true },
    });

    if (!account.storageAggregator) {
      throw new RelationshipNotFoundException(
        `Unable to load Account with required entities for creating an InnovationHub: ${account.id} `,
        LogContext.ACCOUNT
      );
    }
    const hub = await this.innovationHubService.createInnovationHub(
      innovationHubData,
      account
    );
    hub.account = account;
    return await this.innovationHubService.save(hub);
  }

  public async createInnovationPackOnAccount(
    ipData: CreateInnovationPackOnAccountInput
  ): Promise<IInnovationPack> {
    const accountID = ipData.accountID;
    const account = await this.getAccountOrFail(accountID, {
      relations: { storageAggregator: true },
    });

    if (!account.storageAggregator) {
      throw new RelationshipNotFoundException(
        `Unable to load Account with required entities for creating Innovation Pack: ${account.id} `,
        LogContext.ACCOUNT
      );
    }
    const ip = await this.innovationPackService.createInnovationPack(
      ipData,
      account.storageAggregator
    );
    ip.account = account;
    return await this.innovationPackService.save(ip);
  }

  public async activeSubscription(account: IAccount) {
    const licensingFramework =
      await this.licensingService.getDefaultLicensingOrFail();

    const today = new Date();
    const plans = await this.licensingService.getLicensePlans(
      licensingFramework.id
    );

    return (await this.getSubscriptions(account))
      .filter(
        subscription => !subscription.expires || subscription.expires > today
      )
      .map(subscription => {
        return {
          subscription,
          plan: plans.find(
            plan => plan.licenseCredential === subscription.name
          ),
        };
      })
      .filter(item => item.plan?.type === LicensePlanType.SPACE_PLAN)
      .sort((a, b) => b.plan!.sortOrder - a.plan!.sortOrder)?.[0].subscription;
  }

  public async getStorageAggregatorOrFail(
    accountID: string
  ): Promise<IStorageAggregator> {
    const space = await this.getAccountOrFail(accountID, {
      relations: {
        storageAggregator: true,
      },
    });
    const storageAggregator = space.storageAggregator;
    if (!storageAggregator)
      throw new RelationshipNotFoundException(
        `Unable to load storage aggregator for account ${accountID} `,
        LogContext.ACCOUNT
      );
    return storageAggregator;
  }
}
