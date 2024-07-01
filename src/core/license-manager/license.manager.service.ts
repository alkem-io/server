import { Inject, Injectable } from '@nestjs/common';
import { LICENSE_MANAGER } from '@common/constants';
import { CreateCostumer, LicenseManager } from './license.manager';

@Injectable()
export class LicenseManagerService {
  constructor(
    @Inject(LICENSE_MANAGER) private readonly licenseManager: LicenseManager
  ) {}

  /**
   * Create a new costumer
   * @param data
   * @throws {Error} if the request fails
   */
  public createCostumer(data: CreateCostumer): Promise<{ id: string } | never> {
    return this.licenseManager.createCustomer(data);
  }

  public getEntitlements(
    customerId: string
  ): Promise<Record<string, unknown>[]> {
    return this.licenseManager.getEntitlements(customerId);
  }
}
