import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
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
import { SpaceService } from '../space/space.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { ISpace } from '../space/space.interface';
import { CreateVirtualContributorOnAccountInput } from './dto/account.dto.create.virtual.contributor';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { CreateSpaceOnAccountInput } from './dto/account.dto.create.space';
import { CreateInnovationHubOnAccountInput } from './dto/account.dto.create.innovation.hub';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { InnovationHubService } from '@domain/innovation-hub/innovation.hub.service';
import { MAX_SPACE_LEVEL, SpaceLevel } from '@common/enums/space.level';
import { InnovationPackService } from '@library/innovation-pack/innovation.pack.service';
import { CreateInnovationPackOnAccountInput } from './dto/account.dto.create.innovation.pack';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { InnovationPackAuthorizationService } from '@library/innovation-pack/innovation.pack.service.authorization';
import { InnovationHubAuthorizationService } from '@domain/innovation-hub/innovation.hub.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AccountHostService } from '../account.host/account.host.service';
import { IAccountSubscription } from './account.license.subscription.interface';
import { LicensingCredentialBasedCredentialType } from '@common/enums/licensing.credential.based.credential.type';
import { LicenseService } from '@domain/common/license/license.service';
import { InstrumentService } from '@src/apm/decorators';
import { AccountType } from '@common/enums/account.type';
import { AccountLookupService } from '../account.lookup/account.lookup.service';
import { CreateCalloutInput } from '@domain/collaboration/callout/dto/callout.dto.create';
import { PlatformTemplatesService } from '@platform/platform-templates/platform.templates.service';
import { TemplateDefaultType } from '@common/enums/template.default.type';
import { IRoleSet } from '@domain/access/role-set';
import { IAgent } from '@domain/agent';

@InstrumentService()
@Injectable()
export class AccountService {
  constructor(
    private accountHostService: AccountHostService,
    private accountLookupService: AccountLookupService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private spaceService: SpaceService,
    private agentService: AgentService,
    private storageAggregatorService: StorageAggregatorService,
    private virtualContributorService: VirtualContributorService,
    private innovationHubService: InnovationHubService,
    private innovationHubAuthorizationService: InnovationHubAuthorizationService,
    private innovationPackService: InnovationPackService,
    private innovationPackAuthorizationService: InnovationPackAuthorizationService,
    private namingService: NamingService,
    private licenseService: LicenseService,
    private platformTemplatesService: PlatformTemplatesService,
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createSpaceOnAccount(
    spaceData: CreateSpaceOnAccountInput,
    agentInfo: AgentInfo
  ): Promise<ISpace> {
    const account = await this.getAccountOrFail(spaceData.accountID, {
      relations: {
        spaces: true,
        storageAggregator: true,
      },
    });
    if (!account.storageAggregator) {
      throw new RelationshipNotFoundException(
        `Unable to find storage aggregator on account for creating space ${account.id} `,
        LogContext.ACCOUNT
      );
    }

    const reservedNameIDs =
      await this.namingService.getReservedNameIDsLevelZeroSpaces();
    if (!spaceData.nameID) {
      spaceData.nameID = this.namingService.createNameIdAvoidingReservedNameIDs(
        spaceData.about.profileData.displayName,
        reservedNameIDs
      );
    } else {
      if (reservedNameIDs.includes(spaceData.nameID)) {
        throw new ValidationException(
          `Unable to create entity: the provided nameID is already taken or restricted: ${spaceData.nameID}`,
          LogContext.SPACES
        );
      }
    }

    // Set data for the root space
    spaceData.level = SpaceLevel.L0;
    spaceData.storageAggregatorParent = account.storageAggregator;
    // will be set properly after saving to its own ID
    // PostgreSQL requires null (not empty string) for nullable UUID columns
    spaceData.levelZeroSpaceID = undefined as unknown as string;

    let space = await this.spaceService.createRootSpaceAndSubspaces(
      spaceData,
      agentInfo
    );
    space.account = account;
    space = await this.spaceService.save(space);

    space = await this.spaceService.getSpaceOrFail(space.id, {
      relations: {
        community: {
          roleSet: true,
        },
        subspaces: {
          community: {
            roleSet: true,
          },
          subspaces: {
            community: {
              roleSet: true,
            },
          },
        },
        agent: true,
      },
    });
    if (!space.agent || !space.community || !space.community.roleSet) {
      throw new EntityNotInitializedException(
        `Unable to load space ${space.id} with required entities for creating space`,
        LogContext.SPACES
      );
    }
    const spaceAgent = space.agent;

    const roleSets = this.findNestedRoleSets(space);

    if (!agentInfo.isAnonymous) {
      for (const roleSet of roleSets) {
        await this.spaceService.assignUserToRoles(roleSet, agentInfo);
      }
    }

    // Add in org as member + lead if applicable
    if (account.type === AccountType.ORGANIZATION) {
      const host = await this.accountLookupService.getHostOrFail(account);
      const organizationID = host.id;
      const rootRoleSet = space.community.roleSet;
      await this.spaceService.assignOrganizationToMemberLeadRoles(
        rootRoleSet,
        organizationID
      );
    }

    space.agent = await this.accountHostService.assignLicensePlansToSpace(
      spaceAgent,
      space.id,
      account.type,
      spaceData.licensePlanID
    );
    return await this.spaceService.getSpaceOrFail(space.id, {
      relations: {
        agent: true,
      },
    });
  }

  private findNestedRoleSets = (
    space: ISpace,
    spaceLevel: SpaceLevel = SpaceLevel.L0
  ): IRoleSet[] => {
    if (spaceLevel > MAX_SPACE_LEVEL) {
      return [];
    }
    const roleSets: IRoleSet[] = [];
    if (space.community?.roleSet) {
      roleSets.push(space.community.roleSet);
    }
    if (space.subspaces) {
      for (const subspace of space.subspaces) {
        roleSets.push(...this.findNestedRoleSets(subspace, spaceLevel + 1));
      }
    }
    return roleSets;
  };

  async save(account: IAccount): Promise<IAccount> {
    return await this.accountRepository.save(account);
  }

  async deleteAccountOrFail(accountInput: IAccount): Promise<IAccount | never> {
    const accountID = accountInput.id;
    const account = await this.getAccountOrFail(accountID, {
      relations: {
        agent: true,
        spaces: true,
        virtualContributors: true,
        innovationPacks: true,
        storageAggregator: true,
        innovationHubs: true,
        license: true,
      },
    });

    if (
      !account.agent ||
      !account.spaces ||
      !account.virtualContributors ||
      !account.storageAggregator ||
      !account.innovationHubs ||
      !account.innovationPacks ||
      !account.license
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load all entities for deletion of account ${account.id} `,
        LogContext.ACCOUNT
      );
    }

    await this.agentService.deleteAgent(account.agent.id);

    await this.storageAggregatorService.delete(account.storageAggregator.id);

    await this.licenseService.removeLicenseOrFail(account.license.id);

    for (const vc of account.virtualContributors) {
      await this.virtualContributorService.deleteVirtualContributor(vc.id);
    }
    for (const ip of account.innovationPacks) {
      await this.innovationPackService.deleteInnovationPack({ ID: ip.id });
    }

    for (const hub of account.innovationHubs) {
      await this.innovationHubService.delete(hub.id);
    }

    for (const space of account.spaces) {
      await this.spaceService.deleteSpaceOrFail({ ID: space.id });
    }

    const result = await this.accountRepository.remove(account as Account);
    result.id = accountID;
    return result;
  }

  public updateExternalSubscriptionId(
    accountID: string,
    externalSubscriptionID: string
  ) {
    return this.accountRepository.update(accountID, { externalSubscriptionID });
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
    return await this.accountRepository.findOne({
      where: { id: accountID },
      ...options,
    });
  }

  public async getAccountAndDetails(accountID: string) {
    const [account] = await this.accountRepository.query(
      `
        SELECT
          account.id as accountId, account.externalSubscriptionID as externalSubscriptionID,
          organization.id as orgId, organization.contactEmail as orgContactEmail, organization.legalEntityName as orgLegalName, organization.nameID as orgNameID,
          profile.displayName as orgDisplayName,
          user.id as userId, user.email as userEmail, CONCAT(user.firstName, ' ', user.lastName) as userName
        FROM account
        LEFT JOIN user on account.id = user.accountID
        LEFT JOIN organization on account.id = organization.accountID
        left join profile on organization.profileId = profile.id
        WHERE account.id = ?
    `,
      [accountID]
    );

    if (!account) {
      return undefined;
    }

    return {
      accountID,
      externalSubscriptionID: account.externalSubscriptionID,
      user: account.userId
        ? {
            id: account.userId,
            email: account.userEmail,
            name: account.userName,
          }
        : undefined,
      organization: account.orgId
        ? {
            id: account.orgId,
            email: account.orgContactEmail,
            legalName: account.orgLegalName,
            orgLegalName: account.orgLegalName,
            displayName: account.orgDisplayName,
            nameID: account.orgNameID,
          }
        : undefined,
    };
  }

  async getAccounts(options?: FindManyOptions<Account>): Promise<IAccount[]> {
    const accounts = await this.accountRepository.find({
      ...options,
    });

    if (!accounts) return [];

    return accounts;
  }

  public async getAgentOrFail(accountID: string): Promise<IAgent> {
    const account = await this.getAccountOrFail(accountID, {
      relations: {
        agent: true,
      },
    });

    if (!account.agent) {
      throw new EntityNotInitializedException(
        'Unable to load Agent for Account',
        LogContext.ACCOUNT,
        { accountId: accountID }
      );
    }

    return account.agent;
  }

  public async createVirtualContributorOnAccount(
    vcData: CreateVirtualContributorOnAccountInput,
    agentInfo?: AgentInfo
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
        `Unable to load Account with required entities for creating VC: ${account.id} by user ${agentInfo?.userID}`,
        LogContext.ACCOUNT
      );
    }

    const knowledgeBaseCalloutDefaults: CreateCalloutInput[] =
      await this.platformTemplatesService.getCreateCalloutInputsFromTemplate(
        TemplateDefaultType.PLATFORM_SUBSPACE_KNOWLEDGE
      );
    const vc = await this.virtualContributorService.createVirtualContributor(
      vcData,
      knowledgeBaseCalloutDefaults,
      account.storageAggregator,
      agentInfo
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
    let hub = await this.innovationHubService.createInnovationHub(
      innovationHubData,
      account
    );
    hub.account = account;
    hub = await this.innovationHubService.save(hub);
    const authorizations =
      await this.innovationHubAuthorizationService.applyAuthorizationPolicy(
        hub,
        account.authorization
      );
    await this.authorizationPolicyService.saveAll(authorizations);
    return hub;
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
    let ip = await this.innovationPackService.createInnovationPack(
      ipData,
      account.storageAggregator
    );
    ip.account = account;
    ip = await this.innovationPackService.save(ip);
    const authorizations =
      await this.innovationPackAuthorizationService.applyAuthorizationPolicy(
        ip,
        account.authorization
      );
    await this.authorizationPolicyService.saveAll(authorizations);
    return ip;
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
        `Unable to find agent with credentials for the account: ${accountInput.id}`,
        LogContext.ACCOUNT
      );
    }

    const subscriptions: IAccountSubscription[] = [];
    for (const credential of account.agent.credentials) {
      if (
        Object.values(LicensingCredentialBasedCredentialType).includes(
          credential.type as LicensingCredentialBasedCredentialType
        )
      ) {
        subscriptions.push({
          name: credential.type as LicensingCredentialBasedCredentialType,
          expires: credential.expires,
        });
      }
    }
    return subscriptions;
  }
}
