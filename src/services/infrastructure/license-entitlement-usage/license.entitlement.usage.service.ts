import { LogContext } from '@common/enums';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { Account } from '@domain/space/account/account.entity';
import { ISpace } from '@domain/space/space/space.interface';
import { Inject, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager, FindOptionsRelations } from 'typeorm';

/**
 * Priority order for space entitlements (highest to lowest priority).
 * When a space has multiple entitlements, the one with higher priority takes precedence.
 */
const SPACE_ENTITLEMENT_PRIORITY: readonly LicenseEntitlementType[] = [
  LicenseEntitlementType.SPACE_PREMIUM,
  LicenseEntitlementType.SPACE_PLUS,
  LicenseEntitlementType.SPACE_FREE,
] as const;

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
    // optimize the joins based on the type
    const relations: FindOptionsRelations<Account> = {};
    switch (entitlementType) {
      case LicenseEntitlementType.ACCOUNT_SPACE_FREE:
      case LicenseEntitlementType.ACCOUNT_SPACE_PLUS:
      case LicenseEntitlementType.ACCOUNT_SPACE_PREMIUM:
        relations.spaces = {
          license: {
            entitlements: true,
          },
        };
        break;
      case LicenseEntitlementType.ACCOUNT_VIRTUAL_CONTRIBUTOR:
        relations.virtualContributors = true;
        break;
      case LicenseEntitlementType.ACCOUNT_INNOVATION_HUB:
        relations.innovationHubs = true;
        break;
      case LicenseEntitlementType.ACCOUNT_INNOVATION_PACK:
        relations.innovationPacks = true;
        break;
    }

    const account = await this.entityManager.findOne(Account, {
      loadEagerRelations: false,
      where: {
        license: {
          id: licenseID,
        },
      },
      relations,
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

  /**
   * Counts spaces that have a specific entitlement type as their effective entitlement level.
   * Optimized to avoid multiple entitlement checks per space by determining the highest
   * priority entitlement first using the SPACE_ENTITLEMENT_PRIORITY constant.
   */
  private getAccountSpacesTypeCount(
    spaces: ISpace[],
    entitlementType: LicenseEntitlementType
  ): number {
    let result = 0;

    for (const space of spaces) {
      const spaceEntitlementLevel =
        this.getSpaceEffectiveEntitlementLevel(space);

      if (spaceEntitlementLevel === entitlementType) {
        result++;
      }
    }

    return result;
  }

  /**
   * Determines the effective entitlement level for a space based on priority.
   * Returns the highest priority entitlement that is enabled.
   * Uses the SPACE_ENTITLEMENT_PRIORITY constant to determine precedence.
   *
   * @param space The space to check entitlements for
   * @returns The effective entitlement type or null if no valid entitlement is found
   */
  private getSpaceEffectiveEntitlementLevel(
    space: ISpace
  ): LicenseEntitlementType | null {
    // Check entitlements in priority order using the defined constant
    for (const entitlementType of SPACE_ENTITLEMENT_PRIORITY) {
      if (this.hasMatchingLicenseEntitlement(space, entitlementType)) {
        return entitlementType;
      }
    }

    return null; // No valid entitlement found
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
