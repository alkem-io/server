import { Inject, Injectable } from '@nestjs/common';
import { LICENSE_MANAGER } from '@common/constants';
import { CreateCustomer } from './type/licensing.wingback.subscription..type.create.customer';
import { LicenseManager } from './licensing.wingback.subscription.interface';

@Injectable()
export class LicensingWingbackSubscriptionService {
  constructor(
    @Inject(LICENSE_MANAGER) private readonly licenseManager: LicenseManager
  ) {}

  /**
   * Create a new costumer
   * @param data
   * @throws {Error} if the request fails
   */
  public createCustomer(data: CreateCustomer): Promise<{ id: string } | never> {
    return this.licenseManager.createCustomer(data);
  }

  public getEntitlements(
    customerId: string
  ): Promise<Record<string, unknown>[]> {
    return this.licenseManager.getEntitlements(customerId);
  }
}
