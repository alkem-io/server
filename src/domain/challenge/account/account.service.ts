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
import { FindOneOptions, Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Account } from './account.entity';
import { IAccount } from './account.interface';
import { AgentService } from '@domain/agent/agent/agent.service';
import { ITemplatesSet } from '@domain/template/templates-set/templates.set.interface';
import { TemplatesSetService } from '@domain/template/templates-set/templates.set.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { ILicense } from '@domain/license/license/license.interface';
import { LicenseService } from '@domain/license/license/license.service';
import { SpaceDefaultsService } from '../space.defaults/space.defaults.service';
import { UpdateAccountDefaultsInput } from './dto/account.dto.update.defaults';
import { ISpaceDefaults } from '../space.defaults/space.defaults.interface';
import { UpdateAccountInput } from './dto/account.dto.update';

@Injectable()
export class AccountService {
  constructor(
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
    storageAggregator: IStorageAggregator
  ): Promise<IAccount> {
    const account: IAccount = new Account();

    account.spaceID = ''; // set later

    ///////////
    // Create the contextual elements for the account

    // The account library (templates set) and defaults are separate but related concepts
    account.library = await this.templatesSetService.createTemplatesSet();
    account.defaults = await this.spaceDefaultsService.createSpaceDefaults();

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

    account.license = await this.licenseService.createLicense();

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
        LogContext.CHALLENGES
      );
    }

    // Verify that the specified template is in the account library
    const template = account.library.innovationFlowTemplates.find(
      t => t.id === accountDefaultsData.flowTemplateID
    );
    if (!template) {
      throw new NotSupportedException(
        `InnovationFlowTemplate ID provided (${accountDefaultsData.flowTemplateID}) is not part of the Library for the Account ${account.id} `,
        LogContext.CHALLENGES
      );
    }

    return await this.spaceDefaultsService.updateSpaceDefaults(
      account.defaults,
      template
    );
  }

  public async updateAccountPlatformSettings(
    updateData: UpdateAccountInput,
    accountInput: IAccount
  ): Promise<IAccount> {
    const account = await this.getAccountOrFail(accountInput.id, {
      relations: {
        license: true,
      },
    });

    if (!account.license) {
      throw new RelationshipNotFoundException(
        `Unable to load license for account ${account.id} `,
        LogContext.CHALLENGES
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
        library: true,
        license: { featureFlags: true },
        defaults: true,
      },
    });

    if (
      !account.license ||
      !account.license?.featureFlags ||
      !account.defaults ||
      !account.library
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load all entities for deletion of account ${account.id} `,
        LogContext.CHALLENGES
      );
    }

    await this.templatesSetService.deleteTemplatesSet(account.library.id);

    await this.licenseService.delete(account.license.id);
    await this.spaceDefaultsService.deleteSpaceDefaults(account.defaults.id);

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
        LogContext.CHALLENGES
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
        LogContext.CHALLENGES
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
        LogContext.LICENSE
      );
    }

    return license;
  }

  async setAccountHost(
    account: IAccount,
    hostOrgID: string
  ): Promise<IAccount> {
    const spaceID = account.spaceID;
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
        type: AuthorizationCredential.SPACE_HOST,
        resourceID: spaceID,
      });
    }

    // assign the credential
    const agent = await this.organizationService.getAgent(organization);
    organization.agent = await this.agentService.grantCredential({
      agentID: agent.id,
      type: AuthorizationCredential.SPACE_HOST,
      resourceID: spaceID,
    });

    await this.organizationService.save(organization);
    return await this.getAccountOrFail(spaceID);
  }

  async getHost(account: IAccount): Promise<IOrganization | undefined> {
    const organizations =
      await this.organizationService.organizationsWithCredentials({
        type: AuthorizationCredential.SPACE_HOST,
        resourceID: account.spaceID,
      });
    if (organizations.length == 0) {
      return undefined;
    }
    if (organizations.length > 1) {
      throw new RelationshipNotFoundException(
        `More than one host for Account ${account.id} `,
        LogContext.CHALLENGES
      );
    }
    return organizations[0];
  }
}
