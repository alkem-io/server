import { LogContext } from '@common/enums';
import { LicenseEntitlementDataType } from '@common/enums/license.entitlement.data.type';
import { LicenseType } from '@common/enums/license.type';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { LicenseEntitlementNotSupportedException } from '@common/exceptions/license.entitlement.not.supported';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LicenseEntitlementUsageService } from '@services/infrastructure/license-entitlement-usage/license.entitlement.usage.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { ILicense } from '../license/license.interface';
import { CreateLicenseEntitlementInput } from './dto/license.entitlement.dto.create';
import { LicenseEntitlement } from './license.entitlement.entity';
import { ILicenseEntitlement } from './license.entitlement.interface';

@Injectable()
export class LicenseEntitlementService {
  constructor(
    private licenseEntitlementUsageService: LicenseEntitlementUsageService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectRepository(LicenseEntitlement)
    private entitlementRepository: Repository<LicenseEntitlement>
  ) {}

  public createEntitlement(
    entitlementInput: CreateLicenseEntitlementInput
  ): ILicenseEntitlement {
    const entitlement = new LicenseEntitlement();
    entitlement.limit = entitlementInput.limit;
    entitlement.enabled = entitlementInput.enabled;
    entitlement.type = entitlementInput.type;
    entitlement.dataType = entitlementInput.dataType;

    return entitlement;
  }

  async getEntitlementOrFail(
    entitlementID: string,
    options?: FindOneOptions<LicenseEntitlement>
  ): Promise<ILicenseEntitlement | never> {
    const entitlement = await this.entitlementRepository.findOne({
      where: { id: entitlementID },
      ...options,
    });
    if (!entitlement)
      throw new EntityNotFoundException(
        `Not able to locate entitlement with the specified ID: ${entitlementID}`,
        LogContext.SPACES
      );
    return entitlement;
  }

  async deleteEntitlementOrFail(
    entitlementID: string
  ): Promise<ILicenseEntitlement | never> {
    const entitlement = await this.getEntitlementOrFail(entitlementID);

    const { id } = entitlement;
    const result = await this.entitlementRepository.remove(
      entitlement as LicenseEntitlement
    );
    return {
      ...result,
      id,
    };
  }

  public async saveEntitlement(
    entitlement: ILicenseEntitlement
  ): Promise<ILicenseEntitlement> {
    return await this.entitlementRepository.save(entitlement);
  }

  public reset(entitlement: ILicenseEntitlement): ILicenseEntitlement {
    entitlement.limit = 0;
    entitlement.enabled = false;
    return entitlement;
  }

  private async getLicenseAndEntitlementOrFail(
    licenseEntitlementID: string
  ): Promise<{ licenseEntitlement: ILicenseEntitlement; license: ILicense }> {
    const licenseEntitlement = await this.getEntitlementOrFail(
      licenseEntitlementID,
      {
        relations: {
          license: true,
        },
      }
    );
    if (!licenseEntitlement || !licenseEntitlement.license) {
      throw new RelationshipNotFoundException(
        `Unable to load license for entitlement: ${licenseEntitlementID}`,
        LogContext.LICENSE
      );
    }
    const license = licenseEntitlement.license;

    return { licenseEntitlement, license };
  }

  public async getEntitlementUsage(
    licenseEntitlementID: string
  ): Promise<number> {
    const { license, licenseEntitlement } =
      await this.getLicenseAndEntitlementOrFail(licenseEntitlementID);

    if (licenseEntitlement.dataType === LicenseEntitlementDataType.FLAG) {
      return -1;
    }
    return await this.getEntitlementUsageUsingEntities(
      license,
      licenseEntitlement
    );
  }

  public async getEntitlementUsageUsingEntities(
    license: ILicense,
    licenseEntitlement: ILicenseEntitlement
  ): Promise<number> {
    switch (license.type) {
      case LicenseType.ACCOUNT:
        return await this.licenseEntitlementUsageService.getEntitlementUsageForAccount(
          license.id,
          licenseEntitlement.type
        );
      default:
        throw new EntityNotFoundException(
          `Unexpected License Type encountered: ${license.type}`,
          LogContext.LICENSE
        );
    }
  }

  public async isEntitlementAvailable(
    licenseEntitlementID: string
  ): Promise<boolean> {
    const { license, licenseEntitlement } =
      await this.getLicenseAndEntitlementOrFail(licenseEntitlementID);
    return this.isEntitlementAvailableUsingEntities(
      license,
      licenseEntitlement
    );
  }

  public async isEntitlementAvailableUsingEntities(
    license: ILicense,
    licenseEntitlement: ILicenseEntitlement
  ): Promise<boolean> {
    if (licenseEntitlement.dataType === LicenseEntitlementDataType.FLAG) {
      return licenseEntitlement.enabled;
    }

    const entitlementLimit = licenseEntitlement.limit;
    let entitlementsUsed = 999;
    switch (license.type) {
      case LicenseType.ACCOUNT:
        entitlementsUsed = await this.getEntitlementUsageUsingEntities(
          license,
          licenseEntitlement
        );
        break;
      case LicenseType.SPACE:
      case LicenseType.COLLABORATION:
      case LicenseType.ROLESET:
      case LicenseType.WHITEBOARD:
        throw new LicenseEntitlementNotSupportedException(
          `License Type ${license.type} is not supported for entitlement of type ${licenseEntitlement.type}`,
          LogContext.LICENSE
        );
      default:
        throw new EntityNotFoundException(
          `Unexpected License Type encountered when checking availability: ${license.type}`,
          LogContext.LICENSE
        );
    }
    this.logger.verbose?.(
      `Checking entitlement usage on license (${license.id} for entitlement ${licenseEntitlement.type}): ${entitlementsUsed} of ${entitlementLimit}`,
      LogContext.LICENSE
    );

    return entitlementsUsed < entitlementLimit;
  }
}
