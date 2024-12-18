import { Injectable } from '@nestjs/common';
import { CreateCustomer } from '../../../services/external/wingback/types/wingback.type.create.customer';
import { WingbackManager } from '@services/external/wingback/wingback.manager';

@Injectable()
export class LicensingWingbackSubscriptionService {
  constructor(private readonly wingbackManager: WingbackManager) {}

  /**
   * Create a new customer
   * @param data
   * @throws {Error} if the request fails
   */
  public createCustomer(data: CreateCustomer): Promise<{ id: string } | never> {
    return this.wingbackManager.createCustomer(data);
  }

  public getEntitlements(
    customerId: string
  ): Promise<Record<string, unknown>[]> {
    // TODO: return LicensingGrantedEntitlement[]
    return this.wingbackManager.getEntitlements(customerId);
  }
}
