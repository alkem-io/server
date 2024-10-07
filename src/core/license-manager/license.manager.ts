export type CreateCostumer = {
  /** Customer's name */
  name: string;
  /** Customer's emails */
  emails: {
    /** Main email */
    main: string;
    /** Secondary email (optional) */
    secondary?: string;
  };
  /** Customer's address (optional) */
  address?: {
    /** City name */
    city: string;
    /** ISO 3166 2-letter Country code */
    country: string;
    /** First line of address */
    line_1: string;
    /** Second line of the address. Optional */
    line_2: string | null;
    /** State, or another appropriate administrative region */
    state: string | null;
    /** Zip or Postal code */
    zip: string;
  };
  /** Customer's tax details */
  tax_details: {
    /** VAT ID */
    vat_id: string;
  };
  /** Notes about the customer */
  notes: string;
  /** Customer reference */
  customer_reference: string;
  /** Customer's contracts (optional) */
  contracts?: unknown[];
};
export type UpdateCostumer = Record<string, unknown>;
// todo: improve types
export interface LicenseManager {
  // customer
  createCustomer<TPayload extends CreateCostumer>(
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
