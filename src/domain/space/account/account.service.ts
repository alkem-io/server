import { AuthorizationCredential, LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  NotSupportedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { OrganizationService } from '@domain/community/organization/organization.service';
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
import { AgentInfo } from '@core/authentication/agent-info';
import { ISpace } from '../space/space.interface';
import { UpdateAccountPlatformSettingsInput } from './dto/account.dto.update.platform.settings';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { CreateAccountInput } from './dto/account.dto.create';

@Injectable()
export class AccountService {
  constructor(
    private spaceService: SpaceService,
    private agentService: AgentService,
    private organizationService: OrganizationService,
    private templatesSetService: TemplatesSetService,
    private spaceDefaultsService: SpaceDefaultsService,
    private licenseService: LicenseService,
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
    await this.spaceService.validateSpaceData(spaceData);

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

    return await this.accountRepository.save(account);
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
        space: true,
        library: true,
        license: { featureFlags: true },
        defaults: true,
      },
    });

    if (
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

    await this.templatesSetService.deleteTemplatesSet(account.library.id);

    await this.licenseService.delete(account.license.id);
    await this.spaceDefaultsService.deleteSpaceDefaults(account.defaults.id);

    // Remove the account host credential
    const hostAgent = await this.organizationService.getAgent(host);
    host.agent = await this.agentService.revokeCredential({
      agentID: hostAgent.id,
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
    hostOrgID: string
  ): Promise<IAccount> {
    const organization = await this.organizationService.getOrganizationOrFail(
      hostOrgID,
      { relations: { groups: true, agent: true } }
    );

    const existingHost = await this.getHost(account);

    if (existingHost) {
      const agentExisting = await this.organizationService.getAgent(
        existingHost
      );
      organization.agent = await this.agentService.revokeCredential({
        agentID: agentExisting.id,
        type: AuthorizationCredential.ACCOUNT_HOST,
        resourceID: account.id,
      });
    }

    // assign the credential
    const agent = await this.organizationService.getAgent(organization);
    organization.agent = await this.agentService.grantCredential({
      agentID: agent.id,
      type: AuthorizationCredential.ACCOUNT_HOST,
      resourceID: account.id,
    });

    await this.organizationService.save(organization);
    return account;
  }

  async getHost(account: IAccount): Promise<IOrganization | undefined> {
    const organizations =
      await this.organizationService.organizationsWithCredentials({
        type: AuthorizationCredential.ACCOUNT_HOST,
        resourceID: account.id,
      });
    if (organizations.length == 0) {
      return undefined;
    }
    if (organizations.length > 1) {
      throw new RelationshipNotFoundException(
        `More than one host for Account ${account.id} `,
        LogContext.ACCOUNT
      );
    }
    return organizations[0];
  }
}
