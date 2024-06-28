import { AuthorizationCredential, LogContext } from '@common/enums';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ContributorService } from '@domain/community/contributor/contributor.service';
import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IAccount } from '../account/account.interface';
import { AccountException, EntityNotFoundException } from '@common/exceptions';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { User } from '@domain/community/user';
import { Organization } from '@domain/community/organization';
import { AgentService } from '@domain/agent/agent/agent.service';

@Injectable()
export class AccountHostService {
  constructor(
    private contributorService: ContributorService,
    private agentService: AgentService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async getHosts(account: IAccount): Promise<IContributor[]> {
    const contributors =
      await this.contributorService.contributorsWithCredentials({
        type: AuthorizationCredential.ACCOUNT_HOST,
        resourceID: account.id,
      });
    return contributors;
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

  public async getHostCredentials(
    account: IAccount
  ): Promise<ICredentialDefinition[]> {
    const accountHost = await this.getHostOrFail(account);
    const accountHostCredentials: ICredentialDefinition[] = [];
    if (accountHost instanceof User) {
      const userCriteria: ICredentialDefinition = {
        type: AuthorizationCredential.ACCOUNT_HOST,
        resourceID: account.id,
      };
      accountHostCredentials.push(userCriteria);
    } else if (accountHost instanceof Organization) {
      const organizationCriteriaAdmin: ICredentialDefinition = {
        type: AuthorizationCredential.ORGANIZATION_ADMIN,
        resourceID: accountHost.id,
      };
      const organizationCriteriaOwner: ICredentialDefinition = {
        type: AuthorizationCredential.ORGANIZATION_OWNER,
        resourceID: accountHost.id,
      };
      accountHostCredentials.push(organizationCriteriaAdmin);
      accountHostCredentials.push(organizationCriteriaOwner);
    } else {
      throw new AccountException(
        `Unable to determine host type for: ${account.id}, of type '${accountHost.constructor.name}'`,
        LogContext.ACCOUNT
      );
    }

    return accountHostCredentials;
  }

  public async getHostOrFail(account: IAccount): Promise<IContributor> {
    const host = await this.getHost(account);
    if (!host)
      throw new EntityNotFoundException(
        `Unable to find Host for account with ID: ${account.id}`,
        LogContext.COMMUNITY
      );
    return host;
  }

  public async getHostByID(contributorID: string): Promise<IContributor> {
    return this.contributorService.getContributorOrFail(contributorID, {
      relations: {
        agent: true,
      },
    });
  }

  async setAccountHost(
    account: IAccount,
    hostContributorID: string
  ): Promise<IContributor> {
    const contributor = await this.getHostByID(hostContributorID);

    const existingHost = await this.getHost(account);

    if (existingHost) {
      await this.agentService.revokeCredential({
        agentID: existingHost.agent.id,
        type: AuthorizationCredential.ACCOUNT_HOST,
        resourceID: account.id,
      });
    }

    // assign the credential
    contributor.agent = await this.agentService.grantCredential({
      agentID: contributor.agent.id,
      type: AuthorizationCredential.ACCOUNT_HOST,
      resourceID: account.id,
    });

    return contributor;
  }
}
