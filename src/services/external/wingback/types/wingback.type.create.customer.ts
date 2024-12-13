export type CreateCustomer = {
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
