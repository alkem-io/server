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
import { ILicense } from '@domain/license/license/license.interface';
import { LicenseService } from '@domain/license/license/license.service';
import { SpaceDefaultsService } from '../space.defaults/space.defaults.service';
import { UpdateAccountDefaultsInput } from './dto/account.dto.update.defaults';
import { ISpaceDefaults } from '../space.defaults/space.defaults.interface';
import { SpaceService } from '../space/space.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { ISpace } from '../space/space.interface';
import { UpdateAccountPlatformSettingsInput } from './dto/account.dto.update.platform.settings';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { CreateAccountInput } from './dto/account.dto.create';
import { CreateSpaceInput } from '../space/dto/space.dto.create';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ContributorService } from '@domain/community/contributor/contributor.service';

@Injectable()
export class AccountService {
  constructor(
    private spaceService: SpaceService,
    private agentService: AgentService,
    private templatesSetService: TemplatesSetService,
    private spaceDefaultsService: SpaceDefaultsService,
    private licenseService: LicenseService,
    private contributorService: ContributorService,
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createAccount(
    accountData: CreateAccountInput,
    agentInfo?: AgentInfo
  ): Promise<IAccount> {
    // Before doing any creation check the space data!
    const spaceData = accountData.spaceData;
    await this.validateSpaceData(spaceData);

    const account: IAccount = new Account();
    account.authorization = new AuthorizationPolicy();
    account.library = await this.templatesSetService.createTemplatesSet();
    account.defaults = await this.spaceDefaultsService.createSpaceDefaults();
    account.license = await this.licenseService.createLicense({
      visibility: SpaceVisibility.ACTIVE,
    });
    await this.save(account);

    spaceData.level = 0;
    account.space = await this.spaceService.createSpace(
      spaceData,
      account,
      agentInfo
    );
    await this.setAccountHost(account, accountData.hostID);

    account.agent = await this.agentService.createAgent({
      parentDisplayID: `account-${account.space.nameID}`,
    });

    const storageAggregator =
      await this.spaceService.getStorageAggregatorOrFail(account.space.id);
    // And set the defaults
    account.library =
      await this.spaceDefaultsService.addDefaultTemplatesToSpaceLibrary(
        account.library,
        storageAggregator
      );
    if (
      account.defaults &&
      account.library &&
      account.library.innovationFlowTemplates.length !== 0
    ) {
      account.defaults.innovationFlowTemplate =
        account.library.innovationFlowTemplates[0];
    }

    const savedAccount = await this.accountRepository.save(account);
    await this.spaceService.assignUserToRoles(account.space, agentInfo);
    return savedAccount;
  }

  async validateSpaceData(spaceData: CreateSpaceInput) {
    if (!(await this.spaceService.isNameIdAvailable(spaceData.nameID)))
      throw new ValidationException(
        `Unable to create Space: the provided nameID is already taken: ${spaceData.nameID}`,
        LogContext.SPACES
      );
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
      relations: {
        license: true,
        space: true,
      },
    });

    if (!account.license) {
      throw new RelationshipNotFoundException(
        `Unable to load license for account ${account.id} `,
        LogContext.ACCOUNT
      );
    }

    if (updateData.hostID) {
      await this.setAccountHost(account, updateData.hostID);
    }

    if (updateData.license) {
      account.license = await this.licenseService.updateLicense(
        account.license,
        updateData.license
      );
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
        license: { featureFlags: true },
        defaults: true,
      },
    });

    if (
      !account.agent ||
      !account.space ||
      !account.license ||
      !account.license?.featureFlags ||
      !account.defaults ||
      !account.library
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load all entities for deletion of account ${account.id} `,
        LogContext.ACCOUNT
      );
    }

    const host = await this.getHost(account);
    if (!host) {
      throw new RelationshipNotFoundException(
        `Unable to load host for account ${account.id} `,
        LogContext.ACCOUNT
      );
    }

    await this.spaceService.deleteSpace({
      ID: account.space.id,
    });

    await this.agentService.deleteAgent(account.agent.id);

    await this.templatesSetService.deleteTemplatesSet(account.library.id);

    await this.licenseService.delete(account.license.id);
    await this.spaceDefaultsService.deleteSpaceDefaults(account.defaults.id);

    // Remove the account host credential
    host.agent = await this.agentService.revokeCredential({
      agentID: host.agent.id,
      type: AuthorizationCredential.ACCOUNT_HOST,
      resourceID: account.id,
    });

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

  async getLicenseOrFail(accountId: string): Promise<ILicense> {
    const account = await this.getAccountOrFail(accountId, {
      relations: {
        license: { featureFlags: true },
      },
    });
    const license = account.license;

    if (!license) {
      throw new EntityNotFoundException(
        `Unable to find license for account with nameID: ${accountId}`,
        LogContext.ACCOUNT
      );
    }

    return license;
  }

  async getRootSpace(accountInput: IAccount): Promise<ISpace> {
    if (accountInput.space && accountInput.space.profile) {
      return accountInput.space;
    }
    const account = await this.getAccountOrFail(accountInput.id, {
      relations: {
        space: {
          profile: true,
        },
      },
    });
    if (!account.space) {
      throw new EntityNotFoundException(
        `Unable to find space for account: ${accountInput.id}`,
        LogContext.ACCOUNT
      );
    }
    return account.space;
  }

  async setAccountHost(
    account: IAccount,
    hostContributorID: string
  ): Promise<IAccount> {
    const contributor = await this.contributorService.getContributorOrFail(
      hostContributorID,
      {
        relations: {
          agent: true,
        },
      }
    );

    const existingHost = await this.getHost(account);

    if (existingHost) {
      await this.agentService.revokeCredential({
        agentID: existingHost.agent.id,
        type: AuthorizationCredential.ACCOUNT_HOST,
        resourceID: account.id,
      });
    }

    // assign the credential
    await this.agentService.grantCredential({
      agentID: contributor.agent.id,
      type: AuthorizationCredential.ACCOUNT_HOST,
      resourceID: account.id,
    });

    return account;
  }

  async getHost(account: IAccount): Promise<IContributor | null> {
    const contributors =
      await this.contributorService.contributorsWithCredentials({
        type: AuthorizationCredential.ACCOUNT_HOST,
        resourceID: account.id,
      });
    if (contributors.length === 1) {
      return contributors[0];
    } else if (contributors.length > 1) {
      this.logger.error(
        `Account with ID: ${account.id} has multiple hosts. This should not happen.`,
        LogContext.ACCOUNT
      );
    }

    return null;
  }

  async getHostOrFail(account: IAccount): Promise<IContributor> {
    const host = await this.getHost(account);
    if (!host)
      throw new EntityNotFoundException(
        `Unable to find Host for account with ID: ${account.id}`,
        LogContext.COMMUNITY
      );
    return host;
  }
}
