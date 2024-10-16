import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { Account } from '@domain/space/account/account.entity';

export class LicenseEntitlementUsageService {
  constructor(
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async getEntitlementUsageForAccount(
    licenseID: string,
    entitlementType: LicenseEntitlementType
  ): Promise<number> {
    const account = await this.entityManager.findOne(Account, {
      loadEagerRelations: false,
      where: {
        license: {
          id: licenseID,
        },
      },
      relations: {
        spaces: true,
        virtualContributors: true,
        innovationHubs: true,
        innovationPacks: true,
      },
    });
    if (!account) {
      throw new EntityNotFoundException(
        `Unable to find Account with license with ID: ${licenseID}`,
        LogContext.LICENSE
      );
    }
    switch (entitlementType) {
      case LicenseEntitlementType.ACCOUNT_SPACE:
        return account.spaces.length;
      case LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR:
        return account.virtualContributors.length;
      case LicenseEntitlementType.ACCOUNT_INNOVATION_HUB:
        return account.innovationHubs.length;
      case LicenseEntitlementType.ACCOUNT_INNOVATION_PACK:
        return account.innovationPacks.length;
      default:
        throw new RelationshipNotFoundException(
          `Unexpected entitlement type encountered: ${entitlementType}`,
          LogContext.LICENSE
        );
    }
  }
}
