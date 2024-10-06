import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILicense } from './license.interface';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { License } from './license.entity';
import { CreateLicenseInput } from './dto/license.dto.create';
import { AuthorizationPolicy } from '../authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { EntitlementService } from '../license-entitlement/entitlement.service';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { LogContext } from '@common/enums/logging.context';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { IEntitlement } from '../license-entitlement/entitlement.interface';

@Injectable()
export class LicenseService {
  constructor(
    private entitlementService: EntitlementService,
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(License)
    private licenseRepository: Repository<License>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async createLicense(licenseData: CreateLicenseInput): Promise<ILicense> {
    const license: ILicense = License.create(licenseData);
    license.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.LICENSE
    );
    license.entitlements = [];

    for (const entitlementData of licenseData.entitlements) {
      const entitlement =
        this.entitlementService.createEntitlement(entitlementData);
      license.entitlements.push(entitlement);
    }

    return license;
  }

  async getLicenseOrFail(
    licenseID: string,
    options?: FindOneOptions<License>
  ): Promise<ILicense | never> {
    const license = await this.licenseRepository.findOne({
      where: { id: licenseID },
      ...options,
    });
    if (!license)
      throw new EntityNotFoundException(
        `Unable to find License with ID: ${licenseID}`,
        LogContext.LICENSE
      );
    return license;
  }

  async removeLicense(licenseID: string): Promise<ILicense> {
    // Note need to load it in with all contained entities so can remove fully
    const license = await this.getLicenseOrFail(licenseID, {
      relations: {
        entitlements: true,
      },
    });
    if (!license.entitlements) {
      throw new RelationshipNotFoundException(
        `Unable to load child entities for license for deletion: ${license.id} `,
        LogContext.LICENSE
      );
    }

    for (const entitlement of license.entitlements) {
      await this.entitlementService.deleteEntitlement(entitlement.id);
    }

    if (license.authorization)
      await this.authorizationPolicyService.delete(license.authorization);

    const deletedLicense = await this.licenseRepository.remove(
      license as License
    );
    deletedLicense.id = license.id;
    return deletedLicense;
  }

  async save(license: ILicense): Promise<ILicense> {
    return this.licenseRepository.save(license);
  }

  public async getEntitlements(license: ILicense): Promise<IEntitlement[]> {
    let entitlements = license.entitlements;
    if (!entitlements) {
      const licenseWithEntitlements = await this.getLicenseOrFail(license.id, {
        relations: { entitlements: true },
      });
      entitlements = licenseWithEntitlements.entitlements;
    }
    if (!entitlements) {
      throw new RelationshipNotFoundException(
        `Unable to load Entitlements for License: ${license.id}`,
        LogContext.LICENSE
      );
    }
    return entitlements;
  }
}
