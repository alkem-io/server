import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { CreateLicenseEntitlementInput } from './dto/license.entitlement.dto.create';
import { LicenseEntitlement } from './license.entitlement.entity';
import { ILicenseEntitlement } from './license.entitlement.interface';

@Injectable()
export class LicenseEntitlementService {
  constructor(
    @InjectRepository(LicenseEntitlement)
    private entitlementRepository: Repository<LicenseEntitlement>
  ) {}

  public createEntitlement(
    entitlementInput: CreateLicenseEntitlementInput
  ): ILicenseEntitlement {
    const entitlement = LicenseEntitlement.create(entitlementInput);

    return entitlement;
  }

  public async save(
    entitlement: ILicenseEntitlement
  ): Promise<ILicenseEntitlement> {
    return await this.entitlementRepository.save(entitlement);
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

  async deleteEntitlement(entitlementID: string): Promise<ILicenseEntitlement> {
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

  async saveEntitlement(
    entitlement: ILicenseEntitlement
  ): Promise<ILicenseEntitlement> {
    return await this.entitlementRepository.save(entitlement);
  }

  public reset(entitlement: ILicenseEntitlement): ILicenseEntitlement {
    entitlement.limit = 0;
    entitlement.enabled = false;
    return entitlement;
  }
}
