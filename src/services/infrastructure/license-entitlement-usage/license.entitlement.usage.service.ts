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
import { ISpace } from '@domain/space/space/space.interface';

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
        spaces: {
          license: {
            entitlements: true,
          },
        },
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
      case LicenseEntitlementType.ACCOUNT_SPACE_FREE:
        return this.getAccountSpacesTypeCount(
          account.spaces,
          LicenseEntitlementType.SPACE_FREE
        );
      case LicenseEntitlementType.ACCOUNT_SPACE_PLUS:
        return this.getAccountSpacesTypeCount(
          account.spaces,
          LicenseEntitlementType.SPACE_PLUS
        );
      case LicenseEntitlementType.ACCOUNT_SPACE_PREMIUM:
        return this.getAccountSpacesTypeCount(
          account.spaces,
          LicenseEntitlementType.SPACE_PREMIUM
        );
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

  private getAccountSpacesTypeCount(
    spaces: ISpace[],
    _entitlementType: LicenseEntitlementType
  ): number {
    const matchingSpaces = spaces;
    //toDo - fix this, at the moment this path is not working
    // .filter(space =>
    //   this.hasMatchingLicenseEntitlement(space, entitlementType)
    // );
    return matchingSpaces.length;
  }

  private hasMatchingLicenseEntitlement(
    space: ISpace,
    entitlementType: LicenseEntitlementType
  ): boolean {
    const entitlements = space.license?.entitlements;
    if (!entitlements) {
      throw new RelationshipNotFoundException(
        `Unable to load entitlemets for space: ${space.id}`,
        LogContext.LICENSE
      );
    }
    for (const entitlement of entitlements) {
      if (entitlement.type === entitlementType) {
        return entitlement.enabled;
      }
    }
    return false;
  }
}
