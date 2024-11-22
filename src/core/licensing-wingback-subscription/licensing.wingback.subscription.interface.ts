import { CreateCustomer } from './type/licensing.wingback.subscription..type.create.customer';
import { UpdateCostumer } from './type/licensing.wingback.subscription..type.update.customer';

// todo: improve types
export interface LicenseManager {
  // customer
  createCustomer<TPayload extends CreateCustomer>(
    data: TPayload
  ): Promise<{ id: string }>;
  updateCostumer<TPayload extends UpdateCostumer>(
    data: TPayload
  ): Promise<unknown>; // todo
  getCostumer(customerId: string): Promise<unknown>; // todo
  activateCustomer(customerId: string): Promise<boolean>;
  inactivateCustomer(customerId: string): Promise<boolean>;
  // contract
  assignPlan(): Promise<unknown>; // todo
  getEntitlements(customerId: string): Promise<Record<string, unknown>[]>; // todo
  // entitlements
  // usage
  // report usage
  // bulk report usage
  triggerPaymentSession(): Promise<void>;
}
