export type CreateWingbackCustomer = {
  /** Customer's name; Organization or Username */
  name: string;
  /** Customer's emails */
  emails: {
    /** Where the invoices are going to be sent */
    invoice?: string;
    /** The user email; if applicable */
    user?: string;
    /** The organizational email; if applicable */
    organization?: string;
  };
};
