import { CreateCustomer } from './type/licensing.wingback.subscription..type.create.customer';
import { UpdateCustomer } from './type/licensing.wingback.subscription.type.update.customer';

// todo: improve types
export interface LicensingWingbackSubscriptionManager {
  // customer
  createCustomer<TPayload extends CreateCustomer>(
    data: TPayload
  ): Promise<{ id: string }>;
  updateCustomer<TPayload extends UpdateCustomer>(
    data: TPayload
  ): Promise<unknown>; // todo
  getCustomer(customerId: string): Promise<unknown>; // todo
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
