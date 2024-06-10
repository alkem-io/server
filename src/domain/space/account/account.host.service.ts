import { AuthorizationCredential, LogContext } from '@common/enums';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ContributorService } from '@domain/community/contributor/contributor.service';
import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IAccount } from './account.interface';
import { EntityNotFoundException } from '@common/exceptions';

@Injectable()
export class AccountHostService {
  constructor(
    private contributorService: ContributorService,
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
